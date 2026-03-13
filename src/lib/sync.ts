import { supabase } from './supabase';
import { db } from '../db/database';
import type { Movimiento, Categoria } from '../types';

export class SyncService {
    private static instance: SyncService;
    private isSyncing = false;
    private suppressHooks = false;

    static getInstance() {
        if (!this.instance) this.instance = new SyncService();
        return this.instance;
    }

    // --- Core Sync Logic ---

    async syncEverything() {
        if (this.isSyncing) return;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) return;

        this.isSyncing = true;
        this.suppressHooks = true;
        try {
            console.log('🔄 Iniciando sincronización absoluta...');
            
            // 1. Asegurar perfil
            await this.syncProfile(session.user.id);
            
            // 2. Sincronizar Establecimiento actual
            const estabServerId = await this.ensureActiveEstablecimiento(session.user.id);
            if (!estabServerId) throw new Error('No se pudo determinar el establecimiento de servidor');

            // 3. Sincronizar Categorías (Bidireccional)
            await this.syncCategorias(estabServerId);

            // 4. Sincronizar Movimientos (Bidireccional)
            await this.syncMovimientos(estabServerId);

            console.log('✅ Sincronización completada.');
        } catch (e) {
            console.error('❌ Error en sincronización:', e);
        } finally {
            this.isSyncing = false;
            this.suppressHooks = false;
        }
    }

    private async syncProfile(userId: string) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (profile) {
            await db.config.put({ clave: 'nombreUsuario', valor: profile.username });
            await db.config.put({ clave: 'moneda', valor: profile.default_currency });
            if (profile.avatar_url) await db.config.put({ clave: 'avatarUsuario', valor: profile.avatar_url });
        }
    }

    async getProfile(userId: string) {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        return data;
    }

    async updateProfile(username: string, defaultCurrency: string, avatarUrl?: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
            .from('profiles')
            .update({ 
                username, 
                default_currency: defaultCurrency,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', session.user.id);
        
        if (error) throw error;
    }

    private async ensureActiveEstablecimiento(userId: string): Promise<string | null> {
        const localEstName = await db.config.get('nombreEstablecimiento');
        const currentName = localEstName?.valor || 'Mi Establecimiento';
        
        // 1. Verificar si ya tenemos un server_id vinculado localmente
        const existingServerId = await db.getEstablecimientoServerId();

        if (existingServerId) {
            // Actualizar nombre en el servidor por si cambió localmente
            const { data, error } = await supabase
                .from('establecimientos')
                .update({ nombre: currentName })
                .eq('id', existingServerId)
                .select()
                .maybeSingle();
            
            if (data) return data.id;
        }
        
        // 2. Si no hay ID o falló el anterior, buscar por nombre
        const { data: existing } = await supabase
            .from('establecimientos')
            .select('id, nombre, tipo_produccion')
            .eq('user_id', userId)
            .eq('nombre', currentName)
            .maybeSingle();

        if (existing) {
            this.updateLocalEstServerId(existing.id, existing.nombre);
            // Sincronizar configuración local con el servidor
            await db.config.put({ clave: 'nombreEstablecimiento', valor: existing.nombre });
            if (existing.tipo_produccion) {
                await db.config.put({ clave: 'tipoProduccion', valor: existing.tipo_produccion });
            }
            return existing.id;
        }

        // 3. Si no hay por nombre, buscar el primer establecimiento que tenga el usuario en la nube
        const { data: firstOne } = await supabase
            .from('establecimientos')
            .select('id, nombre, tipo_produccion')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();

        if (firstOne) {
            this.updateLocalEstServerId(firstOne.id, firstOne.nombre);
            await db.config.put({ clave: 'nombreEstablecimiento', valor: firstOne.nombre });
            if (firstOne.tipo_produccion) {
                await db.config.put({ clave: 'tipoProduccion', valor: firstOne.tipo_produccion });
            }
            return firstOne.id;
        }

        // 4. Si no existe nada, crear nuevo
        const localTipo = await db.config.get('tipoProduccion');
        const { data: created, error } = await supabase
            .from('establecimientos')
            .insert({
                user_id: userId,
                nombre: currentName,
                tipo_produccion: localTipo?.valor || 'Mixto'
            })
            .select()
            .single();

        if (error) throw error;
        this.updateLocalEstServerId(created.id, created.nombre);
        return created.id;
    }

    private updateLocalEstServerId(serverId: string, nombre: string) {
        const estabs = JSON.parse(localStorage.getItem('ruralit_establecimientos') || '[]');
        const activeDbName = localStorage.getItem('activeEstDB') || 'RuralitDB';
        
        // Buscar si ya existe la entrada local
        const index = estabs.findIndex((e: any) => e.id === activeDbName);
        
        if (index >= 0) {
            estabs[index] = { ...estabs[index], server_id: serverId, nombre };
        } else {
            estabs.push({ id: activeDbName, nombre, server_id: serverId });
        }
        
        localStorage.setItem('ruralit_establecimientos', JSON.stringify(estabs));
    }

    async updateEstablecimientoType(serverId: string, type: string) {
        const { error } = await supabase
            .from('establecimientos')
            .update({ 
                tipo_produccion: type,
                updated_at: new Date().toISOString() 
            })
            .eq('id', serverId);
        if (error) throw error;
    }

    private async syncCategorias(estabId: string) {
        const locales = await db.categorias.toArray();
        for (const cat of locales) {
            if (!cat.server_id) {
                // INSERT
                const { data } = await supabase
                    .from('categorias')
                    .insert({
                        establecimiento_id: estabId,
                        nombre: cat.nombre,
                        tipo: cat.tipo,
                        icono: cat.icono,
                        color: cat.color,
                        es_predefinida: cat.esPredefinida
                    })
                    .select()
                    .single();
                
                if (data) {
                    await db.categorias.update(cat.id!, { server_id: data.id, updated_at: data.creado_en });
                }
            } else {
                // UPDATE (Push local change to remote)
                await supabase
                    .from('categorias')
                    .update({
                        nombre: cat.nombre,
                        icono: cat.icono,
                        color: cat.color
                    })
                    .eq('id', cat.server_id);
            }
        }

        // 2. Bajar remotas que no están locales
        const { data: remotas } = await supabase.from('categorias').select('*').eq('establecimiento_id', estabId);
        if (remotas) {
            for (const r of remotas) {
                const existeLocal = await db.categorias.where('server_id').equals(r.id).first();
                if (!existeLocal) {
                    // Evitar duplicados por nombre si no tiene server_id
                    const coincidenciaNombre = await db.categorias.where('nombre').equals(r.nombre).first();
                    if (coincidenciaNombre) {
                        await db.categorias.update(coincidenciaNombre.id!, { server_id: r.id, updated_at: r.creado_en });
                    } else {
                        await db.categorias.add({
                            nombre: r.nombre,
                            tipo: r.tipo as any,
                            icono: r.icono || '🐄',
                            color: r.color || '#2E7D32',
                            esPredefinida: r.es_predefinida,
                            server_id: r.id,
                            updated_at: r.creado_en
                        } as any);
                    }
                }
            }
        }
    }

    private async syncMovimientos(estabId: string) {
        const locales = await db.movimientos.toArray();
        for (const mov of locales) {
            // Necesitamos el server_id de la categoría
            const cat = await db.categorias.get(mov.categoriaId as number);
            if (!cat?.server_id) continue;

            if (!mov.server_id) {
                // INSERT
                const { data } = await supabase
                    .from('movimientos')
                    .insert({
                        establecimiento_id: estabId,
                        categoria_id: cat.server_id,
                        monto: mov.monto,
                        moneda: mov.moneda || 'UYU',
                        fecha: mov.fecha,
                        nota: mov.nota
                    })
                    .select()
                    .single();

                if (data) {
                    await db.movimientos.update(mov.id!, { server_id: data.id, updated_at: data.creado_en });
                }
            } else {
                // UPDATE
                await supabase
                    .from('movimientos')
                    .update({
                        categoria_id: cat.server_id,
                        monto: mov.monto,
                        moneda: mov.moneda,
                        fecha: mov.fecha,
                        nota: mov.nota
                    })
                    .eq('id', mov.server_id);
            }
        }

        // 2. Bajar remotos
        const { data: remotos } = await supabase.from('movimientos').select('*').eq('establecimiento_id', estabId);
        if (remotos) {
            for (const r of remotos) {
                const existeLocal = await db.movimientos.where('server_id').equals(r.id).first();
                if (!existeLocal) {
                    // Buscar la categoría local por server_id
                    const catLocal = await db.categorias.where('server_id').equals(r.categoria_id).first();
                    if (!catLocal) continue;

                    await db.movimientos.add({
                        monto: r.monto,
                        moneda: r.moneda,
                        fecha: r.fecha,
                        nota: r.nota,
                        tipo: catLocal.tipo,
                        categoriaId: catLocal.id!,
                        creado_en: r.creado_en,
                        server_id: r.id,
                        updated_at: r.creado_en
                    } as any);
                }
            }
        }
    }

    // --- Hooks para Sincronización en Tiempo Real ---

    initHooks() {
        const trigger = () => this.triggerBackgroundSync();

        // Movimientos
        db.movimientos.hook('creating', trigger);
        db.movimientos.hook('updating', trigger);
        db.movimientos.hook('deleting', (primKey, obj) => {
            if (obj.server_id) this.deleteRemote('movimientos', obj.server_id);
            trigger();
        });

        // Categorías
        db.categorias.hook('creating', trigger);
        db.categorias.hook('updating', trigger);
        db.categorias.hook('deleting', (primKey, obj) => {
            if (obj.server_id) this.deleteRemote('categorias', obj.server_id);
            trigger();
        });
    }

    private async deleteRemote(table: string, serverId: string) {
        if (this.suppressHooks) return;
        try {
            await supabase.from(table).delete().eq('id', serverId);
        } catch (e) {
            console.error(`Error eliminando ${table} de servidor:`, e);
        }
    }

    private triggerBackgroundSync() {
        if (this.suppressHooks) return;
        // Debounce simple para no saturar
        setTimeout(() => this.syncEverything(), 2000);
    }
}

export const syncService = SyncService.getInstance();

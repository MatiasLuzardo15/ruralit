import { supabase } from '../lib/supabase';
import type { Movimiento, Categoria, TipoMovimiento, Establecimiento, Moneda } from '../types';

export class DataService {
    private static instance: DataService;

    static getInstance() {
        if (!this.instance) this.instance = new DataService();
        return this.instance;
    }

    // --- Cache Helpers ---
    private getCache<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(`ruralit_cache_${key}`);
            return item ? JSON.parse(item) : null;
        } catch { return null; }
    }

    private setCache(key: string, data: any) {
        try {
            localStorage.setItem(`ruralit_cache_${key}`, JSON.stringify(data));
        } catch (e) {}
    }

    clearCache() {
        this.activeEstabCache = null;
    }

    // --- Establecimientos ---

    async addEstablecimiento(nombre: string, tipoProduccion: string = 'Ganadería', monedasActivas: string[] = ['UYU']) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const { data, error } = await supabase
            .from('establecimientos')
            .insert({
                user_id: session.user.id,
                nombre,
                tipo_produccion: tipoProduccion,
                monedas_activas: monedasActivas
            })
            .select()
            .single();

        if (error) throw error;
        this.clearCache();
        localStorage.removeItem(`ruralit_cache_estabs_${session.user.id}`);
        return data;
    }

    async deleteEstablecimiento(id: string) {
        const { error } = await supabase
            .from('establecimientos')
            .delete()
            .eq('id', id);
        if (error) throw error;
        this.clearCache();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) localStorage.removeItem(`ruralit_cache_estabs_${session.user.id}`);
    }

    async getEstablecimientos(): Promise<Establecimiento[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        // Return cache immediately if available
        const cached = this.getCache<Establecimiento[]>(`estabs_${session.user.id}`);
        
        const fetchPromise = supabase
            .from('establecimientos')
            .select('*')
            .eq('user_id', session.user.id)
            .order('creado_en', { ascending: false })
            .then(({ data, error }) => {
                if (error) return [];
                const mapped = data.map(d => ({
                    id: d.id,
                    nombre: d.nombre,
                    tipo_produccion: d.tipo_produccion,
                    monedas_activas: d.monedas_activas
                }));
                this.setCache(`estabs_${session.user.id}`, mapped);
                return mapped;
            });

        return cached || await fetchPromise;
    }

    async updateEstablecimiento(estabId: string, updates: Partial<Establecimiento> & { monedas_activas?: string[] }) {
        const { error } = await supabase
            .from('establecimientos')
            .update(updates)
            .eq('id', estabId);
        if (error) throw error;
        this.clearCache();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) localStorage.removeItem(`ruralit_cache_estabs_${session.user.id}`);
    }

    async getMonedasActivas(estabId: string): Promise<Moneda[]> {
        const cacheKey = `monedas_${estabId}`;
        const cached = this.getCache<Moneda[]>(cacheKey);

        const fetchPromise = supabase
            .from('establecimientos')
            .select('monedas_activas')
            .eq('id', estabId)
            .maybeSingle()
            .then(({ data, error }): Moneda[] => {
                if (error || !data) {
                    return cached || ['UYU'];
                }
                return (data.monedas_activas as unknown as Moneda[]) || ['UYU'];
            });

        const result = cached || await fetchPromise;
        if (result) this.setCache(cacheKey, result);
        return result;
    }

    async updateMonedasActivas(estabId: string, monedas: Moneda[]) {
        const { error } = await supabase
            .from('establecimientos')
            .update({ monedas_activas: monedas })
            .eq('id', estabId);
        if (error) throw error;
        
        // Invalidate caches
        this.clearCache();
        localStorage.removeItem(`ruralit_cache_monedas_${estabId}`);
    }

    private activeEstabCache: any = null;

    async getEstablecimientoActivo(): Promise<any | null> {
        if (this.activeEstabCache) return this.activeEstabCache;

        let activeId = localStorage.getItem('activeEstDB_uuid');
        
        if (!activeId) {
            try {
                const list = await this.getEstablecimientos();
                if (list.length > 0) {
                    activeId = String(list[0].id);
                    localStorage.setItem('activeEstDB_uuid', activeId);
                } else {
                    return null;
                }
            } catch (e) {
                return null;
            }
        }

        const { data, error } = await supabase
            .from('establecimientos')
            .select('*')
            .eq('id', activeId)
            .maybeSingle();

        if (error || !data) {
            localStorage.removeItem('activeEstDB_uuid');
            const list = await this.getEstablecimientos();
            if (list.length > 0) {
                const newId = String(list[0].id);
                localStorage.setItem('activeEstDB_uuid', newId);
                const { data: retryData } = await supabase.from('establecimientos').select('*').eq('id', newId).maybeSingle();
                this.activeEstabCache = retryData;
                return retryData;
            }
            return null;
        }
        this.activeEstabCache = data;
        return data;
    }

    // --- Perfil ---

    async getProfile(): Promise<any> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const cached = this.getCache(`profile_${session.user.id}`);
        
        const fetchPromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!error && data) {
                    this.setCache(`profile_${session.user.id}`, data);
                }
                return data;
            });

        return cached || await fetchPromise;
    }

    async updateProfile(username: string, avatarUrl: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Intentamos primero actualizar
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
                username, 
                avatar_url: avatarUrl 
            })
            .eq('id', session.user.id);

        if (updateError) {
            console.warn('Update failed, trying insert/upsert:', updateError);
            // Si falla por 400 (Bad Request), podría ser que el registro no existe o columnas faltantes
            // Intentamos un upsert básico sin campos de tiempo
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({ 
                    id: session.user.id,
                    username, 
                    avatar_url: avatarUrl
                }, { onConflict: 'id' });

            if (upsertError) {
                console.warn('Full upsert failed, trying only username fallback:', upsertError);
                // Último intento: solo el nombre de usuario (por si avatar_url es lo que falla)
                const { error: finalError } = await supabase
                    .from('profiles')
                    .upsert({ 
                        id: session.user.id,
                        username
                    }, { onConflict: 'id' });
                
                if (finalError) throw finalError;
            }
        }
        
        window.dispatchEvent(new CustomEvent('ruralit_profile_updated'));
    }

    async updateTheme(theme: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        await supabase
            .from('profiles')
            .update({ theme })
            .eq('id', session.user.id);
            
        // Clean cache to ensure next getProfile shows new theme
        localStorage.removeItem(`ruralit_cache_profile_${session.user.id}`);
    }

    // --- Categorías ---

    async getCategorias(estabId: string, forceRefresh: boolean = false): Promise<Categoria[]> {
        const cacheKey = `cats_${estabId}`;
        const cached = !forceRefresh ? this.getCache<Categoria[]>(cacheKey) : null;

        const fetchPromise = supabase
            .from('categorias')
            .select('*')
            .eq('establecimiento_id', estabId)
            .order('nombre')
            .then(({ data, error }) => {
                if (error) return [];
                const mapped = data.map(d => ({
                    id: d.id,
                    nombre: d.nombre,
                    tipo: d.tipo,
                    icono: d.icono,
                    color: d.color,
                    esPredefinida: d.es_predefinida,
                    server_id: d.id
                }));
                this.setCache(cacheKey, mapped);
                return mapped;
            });

        return cached || await fetchPromise;
    }

    async addCategoria(estabId: string, cat: Omit<Categoria, 'id'>) {
        const { data, error } = await supabase
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

        if (error) throw error;
        // Invalidate categories cache
        localStorage.removeItem(`ruralit_cache_cats_${estabId}`);
        return data;
    }

    async updateCategoria(catId: string, cat: Partial<Categoria>) {
        const { error } = await supabase
            .from('categorias')
            .update({
                nombre: cat.nombre,
                icono: cat.icono,
                color: cat.color
            })
            .eq('id', catId);

        if (error) throw error;
        // Invalidate categories cache
        const { data: catData } = await supabase.from('categorias').select('establecimiento_id').eq('id', catId).single();
        if (catData) localStorage.removeItem(`ruralit_cache_cats_${catData.establecimiento_id}`);
    }

    async deleteCategoria(catId: string) {
        const { data: catData } = await supabase.from('categorias').select('establecimiento_id').eq('id', catId).single();
        const { error } = await supabase
            .from('categorias')
            .delete()
            .eq('id', catId);
        if (error) throw error;
        if (catData) localStorage.removeItem(`ruralit_cache_cats_${catData.establecimiento_id}`);
    }

    // --- Movimientos ---

    async getMovimientos(estabId: string, options?: { from?: string, to?: string }, forceRefresh: boolean = false): Promise<Movimiento[]> {
        const cacheKey = `movs_${estabId}_${options?.from}_${options?.to}`;
        const cached = !forceRefresh ? this.getCache<Movimiento[]>(cacheKey) : null;

        const fetchPromise = (async () => {
            let query = supabase
                .from('movimientos')
                .select('*, categorias(*)')
                .eq('establecimiento_id', estabId)
                .order('fecha', { ascending: false })
                .order('creado_en', { ascending: false });

            if (options?.from) query = query.gte('fecha', options.from);
            if (options?.to) query = query.lte('fecha', options.to);

            const { data, error } = await query;
            if (error) return [];

            const mapped = data.map(d => ({
                id: d.id,
                tipo: d.categorias?.tipo || 'gasto',
                monto: d.monto,
                moneda: d.moneda,
                categoriaId: d.categoria_id,
                nota: d.nota,
                fecha: d.fecha,
                creado_en: d.creado_en,
                server_id: d.id
            }));

            this.setCache(cacheKey, mapped);
            return mapped;
        })();

        if (cached) {
            fetchPromise; 
            return cached;
        }

        return await fetchPromise;
    }

    // --- Helper to clear movement caches ---
    private clearMovementCache(estabId: string) {
        const prefix = 'ruralit_cache_movs_' + estabId;
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith(prefix)) {
                localStorage.removeItem(k);
            }
        });
        // También disparamos un evento global para que la UI se entere de que los datos cambiaron
        window.dispatchEvent(new CustomEvent('ruralit_data_changed'));
    }

    async addMovimiento(estabId: string, mov: Omit<Movimiento, 'id'>) {
        const { data, error } = await supabase
            .from('movimientos')
            .insert({
                establecimiento_id: estabId,
                categoria_id: mov.categoriaId,
                monto: mov.monto,
                moneda: mov.moneda,
                fecha: mov.fecha,
                nota: mov.nota,
                creado_en: mov.creado_en || new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        
        this.clearMovementCache(estabId);
        return data;
    }

    async updateMovimiento(movId: string, mov: Partial<Movimiento>) {
        const { data: current } = await supabase.from('movimientos').select('establecimiento_id').eq('id', movId).single();
        
        const { error } = await supabase
            .from('movimientos')
            .update({
                categoria_id: mov.categoriaId,
                monto: mov.monto,
                moneda: mov.moneda,
                fecha: mov.fecha,
                nota: mov.nota
            })
            .eq('id', movId);

        if (error) throw error;

        if (current?.establecimiento_id) {
            this.clearMovementCache(current.establecimiento_id);
        }
    }

    async deleteMovimiento(movId: string) {
        const { data: current } = await supabase.from('movimientos').select('establecimiento_id').eq('id', movId).single();

        const { error } = await supabase
            .from('movimientos')
            .delete()
            .eq('id', movId);
        if (error) throw error;

        if (current?.establecimiento_id) {
            this.clearMovementCache(current.establecimiento_id);
        }
    }
}

export const dataService = DataService.getInstance();

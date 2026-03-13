-- 1. Tablas Principales
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  default_currency TEXT DEFAULT 'UYU',
  avatar_url TEXT DEFAULT '👨‍🌾',
  theme TEXT DEFAULT 'light',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.establecimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  tipo_produccion TEXT NOT NULL,
  monedas_activas TEXT[] DEFAULT '{UYU}',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('ingreso', 'gasto')) NOT NULL,
  icono TEXT,
  color TEXT,
  es_predefinida BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  monto DECIMAL(15,2) NOT NULL,
  moneda TEXT NOT NULL,
  fecha DATE NOT NULL,
  nota TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Seguridad (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establecimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes para evitar errores de duplicidad al re-ejecutar
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can manage their establishments" ON public.establecimientos;
    DROP POLICY IF EXISTS "Users can manage categories of their establishments" ON public.categorias;
    DROP POLICY IF EXISTS "Users can manage movements of their establishments" ON public.movimientos;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Crear Políticas de Acceso
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their establishments" ON public.establecimientos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage categories of their establishments" ON public.categorias FOR ALL USING (
    EXISTS (SELECT 1 FROM public.establecimientos WHERE id = categorias.establecimiento_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage movements of their establishments" ON public.movimientos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.establecimientos WHERE id = movimientos.establecimiento_id AND user_id = auth.uid())
);

-- 3. Funciones y Triggers Automáticos

-- A. Crear perfil automáticamente al registrarse el usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, default_currency, avatar_url)
  VALUES (new.id, split_part(new.email, '@', 1), 'UYU', '👨‍🌾');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Actualizar automáticamente el campo 'updated_at' en perfiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

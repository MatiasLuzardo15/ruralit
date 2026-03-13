-- RURALIA DATABASE SCHEMA (Migration from IndexedDB)

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  default_currency TEXT DEFAULT 'UYU',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Establishments Table
CREATE TABLE IF NOT EXISTS public.establecimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  tipo_produccion TEXT NOT NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Categories Table
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

-- 4. Movements Table
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

-- Row Level Security (RLS) - Basic Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establecimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage their establishments" ON public.establecimientos 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage categories of their establishments" ON public.categorias
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.establecimientos 
      WHERE id = categorias.establecimiento_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage movements of their establishments" ON public.movimientos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.establecimientos 
      WHERE id = movimientos.establecimiento_id AND user_id = auth.uid()
    )
  );

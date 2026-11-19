-- Tabla en Supabase para el registro de puntos de acceso urbano
-- Ejecutá este script en el SQL Editor de tu proyecto de Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.puntos_acceso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_punto text NOT NULL CHECK (char_length(trim(nombre_punto)) > 0),
  latitud double precision NOT NULL CHECK (latitud >= -90 AND latitud <= 90),
  longitud double precision NOT NULL CHECK (longitud >= -180 AND longitud <= 180),
  edificio text NOT NULL CHECK (char_length(trim(edificio)) > 0),
  calle_acceso text NOT NULL CHECK (char_length(trim(calle_acceso)) > 0),
  tipo_entrada text NOT NULL CHECK (tipo_entrada IN ('con rampa', 'con escalones')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para filtrar eficientemente por tipo de entrada
CREATE INDEX IF NOT EXISTS idx_puntos_acceso_tipo_entrada
  ON public.puntos_acceso (tipo_entrada);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.actualizar_updated_at_puntos_acceso()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_puntos_acceso_updated_at ON public.puntos_acceso;
CREATE TRIGGER trg_puntos_acceso_updated_at
  BEFORE UPDATE ON public.puntos_acceso
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at_puntos_acceso();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.puntos_acceso ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para operaciones web desde la app
DROP POLICY IF EXISTS "Permitir lectura pública de puntos_acceso" ON public.puntos_acceso;
CREATE POLICY "Permitir lectura pública de puntos_acceso"
  ON public.puntos_acceso FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir inserción en puntos_acceso" ON public.puntos_acceso;
CREATE POLICY "Permitir inserción en puntos_acceso"
  ON public.puntos_acceso FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización en puntos_acceso" ON public.puntos_acceso;
CREATE POLICY "Permitir actualización en puntos_acceso"
  ON public.puntos_acceso FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminación en puntos_acceso" ON public.puntos_acceso;
CREATE POLICY "Permitir eliminación en puntos_acceso"
  ON public.puntos_acceso FOR DELETE
  USING (true);

-- Tres ejemplos iniciales en ubicaciones distintas
INSERT INTO public.puntos_acceso (
  nombre_punto,
  latitud,
  longitud,
  edificio,
  calle_acceso,
  tipo_entrada
)
SELECT * FROM (
  VALUES
    (
      'Acceso Principal Paseo Colón',
      -34.617638::double precision,
      -58.368082::double precision,
      'Facultad de Ingeniería (UBA)',
      'Av. Paseo Colón 850',
      'con rampa'
    ),
    (
      'Ingreso Explanada Norte',
      -34.584297::double precision,
      -58.398156::double precision,
      'Biblioteca Nacional Mariano Moreno',
      'Agüero 2502',
      'con rampa'
    ),
    (
      'Pórtico Plaza Libertad',
      -34.601041::double precision,
      -58.383078::double precision,
      'Teatro Colón',
      'Cerrito 628',
      'con escalones'
    )
) AS semillas(nombre_punto, latitud, longitud, edificio, calle_acceso, tipo_entrada)
WHERE NOT EXISTS (SELECT 1 FROM public.puntos_acceso LIMIT 1);

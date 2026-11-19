import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  type AccessPoint,
  INITIAL_SEED_POINTS,
  type TipoEntrada,
  parseDecimalCoordinate,
  validateAccessPointFields,
} from './src/types/accessPoint.ts';

const PORT = 3000;
const TABLE_NAME = 'puntos_acceso';
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, 'puntos_acceso.json');

function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function ensureLocalStore(): AccessPoint[] {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DATA_FILE)) {
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(INITIAL_SEED_POINTS, null, 2), 'utf8');
    return [...INITIAL_SEED_POINTS];
  }
  try {
    const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as AccessPoint[];
    }
  } catch {
    // Re-initialize if file was corrupted
  }
  fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(INITIAL_SEED_POINTS, null, 2), 'utf8');
  return [...INITIAL_SEED_POINTS];
}

function writeLocalStore(points: AccessPoint[]): void {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(points, null, 2), 'utf8');
}

async function listPoints(tipoEntrada?: string): Promise<AccessPoint[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase
      .from(TABLE_NAME)
      .select('id, nombre_punto, latitud, longitud, edificio, calle_acceso, tipo_entrada, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (tipoEntrada === 'con rampa' || tipoEntrada === 'con escalones') {
      query = query.eq('tipo_entrada', tipoEntrada);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error al consultar Supabase: ${error.message}`);
    }

    // Seed 3 examples automatically if table exists and is completely empty (when unfiltered)
    if (!tipoEntrada && (!data || data.length === 0)) {
      const seedPayload = INITIAL_SEED_POINTS.map(({ id: _id, created_at: _c, ...rest }) => rest);
      const { data: inserted, error: seedError } = await supabase
        .from(TABLE_NAME)
        .insert(seedPayload)
        .select('id, nombre_punto, latitud, longitud, edificio, calle_acceso, tipo_entrada, created_at, updated_at');

      if (!seedError && inserted) {
        return inserted as AccessPoint[];
      }
    }

    return (data || []) as AccessPoint[];
  }

  const localPoints = ensureLocalStore();
  if (tipoEntrada === 'con rampa' || tipoEntrada === 'con escalones') {
    return localPoints.filter((p) => p.tipo_entrada === tipoEntrada);
  }
  return localPoints;
}

async function createPoint(payload: {
  nombre_punto: string;
  latitud: number;
  longitud: number;
  edificio: string;
  calle_acceso: string;
  tipo_entrada: TipoEntrada;
}): Promise<AccessPoint> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select('id, nombre_punto, latitud, longitud, edificio, calle_acceso, tipo_entrada, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(`Error al guardar en Supabase: ${error.message}`);
    }
    return data as AccessPoint;
  }

  const localPoints = ensureLocalStore();
  const created: AccessPoint = {
    id: randomUUID(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  localPoints.push(created);
  writeLocalStore(localPoints);
  return created;
}

async function updatePoint(
  id: string,
  payload: {
    nombre_punto: string;
    latitud: number;
    longitud: number;
    edificio: string;
    calle_acceso: string;
    tipo_entrada: TipoEntrada;
  }
): Promise<AccessPoint | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', id)
      .select('id, nombre_punto, latitud, longitud, edificio, calle_acceso, tipo_entrada, created_at, updated_at')
      .maybeSingle();

    if (error) {
      throw new Error(`Error al actualizar en Supabase: ${error.message}`);
    }
    return (data as AccessPoint) || null;
  }

  const localPoints = ensureLocalStore();
  const index = localPoints.findIndex((p) => p.id === id);
  if (index === -1) {
    return null;
  }
  const updated: AccessPoint = {
    ...localPoints[index],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  localPoints[index] = updated;
  writeLocalStore(localPoints);
  return updated;
}

async function deletePoint(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      throw new Error(`Error al eliminar en Supabase: ${error.message}`);
    }
    return Array.isArray(data) && data.length > 0;
  }

  const localPoints = ensureLocalStore();
  const nextPoints = localPoints.filter((p) => p.id !== id);
  if (nextPoints.length === localPoints.length) {
    return false;
  }
  writeLocalStore(nextPoints);
  return true;
}

function validateAndSanitizeBody(body: Record<string, unknown>) {
  const nombre_punto = typeof body.nombre_punto === 'string' ? body.nombre_punto.trim() : '';
  const edificio = typeof body.edificio === 'string' ? body.edificio.trim() : '';
  const calle_acceso = typeof body.calle_acceso === 'string' ? body.calle_acceso.trim() : '';
  const tipo_entrada = typeof body.tipo_entrada === 'string' ? body.tipo_entrada.trim() : '';
  const rawLat =
    typeof body.latitud === 'number' || typeof body.latitud === 'string' ? body.latitud : '';
  const rawLng =
    typeof body.longitud === 'number' || typeof body.longitud === 'string' ? body.longitud : '';

  const errors = validateAccessPointFields({
    nombre_punto,
    edificio,
    calle_acceso,
    tipo_entrada,
    latitud: rawLat,
    longitud: rawLng,
  });

  if (Object.keys(errors).length > 0) {
    return { errors, data: null };
  }

  const latitud = parseDecimalCoordinate(rawLat)!;
  const longitud = parseDecimalCoordinate(rawLng)!;

  return {
    errors: null,
    data: {
      nombre_punto,
      edificio,
      calle_acceso,
      tipo_entrada: tipo_entrada as TipoEntrada,
      latitud,
      longitud,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/points', async (req: Request, res: Response) => {
    try {
      const tipoEntrada =
        typeof req.query.tipo_entrada === 'string' ? req.query.tipo_entrada : undefined;
      const points = await listPoints(tipoEntrada);
      res.json(points);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error interno del servidor';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/points', async (req: Request, res: Response) => {
    try {
      const { errors, data } = validateAndSanitizeBody(req.body ?? {});
      if (errors || !data) {
        res.status(400).json({ error: 'Datos inválidos', details: errors });
        return;
      }
      const created = await createPoint(data);
      res.status(201).json(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el punto';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/points/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { errors, data } = validateAndSanitizeBody(req.body ?? {});
      if (errors || !data) {
        res.status(400).json({ error: 'Datos inválidos', details: errors });
        return;
      }
      const updated = await updatePoint(id, data);
      if (!updated) {
        res.status(404).json({ error: 'Punto de acceso no encontrado' });
        return;
      }
      res.json(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el punto';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/points/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const removed = await deletePoint(id);
      if (!removed) {
        res.status(404).json({ error: 'Punto de acceso no encontrado' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el punto';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

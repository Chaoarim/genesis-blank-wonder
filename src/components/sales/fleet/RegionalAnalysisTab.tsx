import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Upload, Loader2, Trash2, MapPin, FileSpreadsheet, Settings, Download } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportExcel';

interface RegionalData {
  id: string;
  year: number;
  month: number | null;
  region: string;
  vehicle_type: string;
  quantity: number;
  percentage: number;
}

interface RegionalAnalysisTabProps {
  readOnly?: boolean;
}

const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const VEHICLE_TYPES = [
  { value: 'automovel', label: 'Automóveis' },
  { value: 'comercial_leve', label: 'Comerciais Leves' },
  { value: 'automovel_comercial_leve', label: 'Automóveis + Comerciais Leves' },
];

const REGION_COLORS: Record<string, string> = {
  'Norte': '#10b981',
  'Nordeste': '#f59e0b',
  'Centro-Oeste': '#3b82f6',
  'Sudeste': '#8b5cf6',
  'Sul': '#ef4444',
};

const BUILTIN_YEAR_OPTIONS = [2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010];

// FENABRAVE 2010 seed data
const FENABRAVE_2010_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [1.89, 4.11, 4.26, 4.39, 4.64, 4.20, 4.51, 4.38, 4.17, 4.12, 4.66, 4.63],
    'Nordeste':     [16.81, 15.59, 15.27, 15.15, 15.41, 14.54, 15.40, 15.13, 15.23, 14.48, 15.35, 15.83],
    'Centro-Oeste': [9.21, 9.76, 9.55, 9.51, 9.41, 9.60, 9.32, 9.93, 9.66, 9.25, 8.91, 10.07],
    'Sudeste':      [51.34, 52.18, 52.63, 52.89, 52.47, 52.92, 52.64, 52.16, 53.19, 52.91, 52.09, 50.67],
    'Sul':          [18.75, 18.37, 18.29, 18.06, 18.07, 18.73, 18.12, 18.39, 17.75, 19.23, 18.99, 18.80],
  },
  comercial_leve: {
    'Norte':        [6.54, 6.31, 6.82, 7.09, 7.42, 7.12, 7.39, 7.66, 6.93, 6.48, 7.29, 7.52],
    'Nordeste':     [16.87, 16.19, 16.74, 16.76, 16.02, 15.55, 16.17, 15.82, 16.38, 14.54, 15.86, 16.21],
    'Centro-Oeste': [11.40, 11.51, 12.09, 11.78, 11.35, 11.77, 11.47, 10.97, 10.95, 10.68, 10.47, 12.49],
    'Sudeste':      [46.39, 48.23, 45.82, 45.98, 46.55, 47.56, 46.98, 47.61, 47.85, 49.26, 47.35, 44.60],
    'Sul':          [18.80, 17.76, 18.53, 18.39, 18.66, 17.99, 17.94, 17.88, 17.05, 19.05, 19.01, 19.17],
  },
  automovel_comercial_leve: {
    'Norte':        [4.27, 4.42, 4.58, 4.77, 5.08, 4.67, 4.95, 4.84, 4.56, 4.46, 5.02, 5.02],
    'Nordeste':     [16.82, 15.67, 15.45, 15.37, 15.51, 14.71, 15.51, 15.23, 15.39, 14.49, 15.42, 15.88],
    'Centro-Oeste': [9.53, 10.00, 9.86, 9.83, 9.71, 9.94, 9.63, 10.08, 9.84, 9.46, 9.13, 10.40],
    'Sudeste':      [50.62, 51.63, 51.79, 51.93, 51.53, 52.07, 51.81, 51.53, 52.45, 52.38, 51.44, 49.86],
    'Sul':          [18.76, 18.28, 18.32, 18.11, 18.16, 18.61, 18.10, 18.32, 17.72, 19.22, 18.98, 18.85],
  },
};

// FENABRAVE 2011 seed data
const FENABRAVE_2011_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.12, 4.15, 4.24, 4.24, 4.18, 3.80, 4.01, 4.49, 3.71, 4.01, 4.30, 4.30],
    'Nordeste':     [17.05, 16.25, 14.81, 14.49, 14.98, 14.44, 14.98, 15.35, 15.32, 14.23, 14.20, 15.01],
    'Centro-Oeste': [10.02, 9.90, 9.73, 9.87, 9.67, 9.26, 9.29, 9.35, 8.83, 9.23, 8.72, 9.12],
    'Sudeste':      [49.86, 51.35, 52.01, 52.58, 51.95, 53.02, 52.28, 51.62, 52.45, 52.77, 53.94, 50.37],
    'Sul':          [18.95, 18.34, 19.21, 18.83, 19.17, 19.65, 19.66, 18.92, 20.07, 19.13, 21.20, 21.20],
  },
  comercial_leve: {
    'Norte':        [6.61, 6.02, 6.70, 6.84, 6.66, 6.63, 6.10, 6.64, 8.15, 7.08, 7.26, 7.84],
    'Nordeste':     [16.97, 15.31, 15.42, 15.54, 14.68, 14.95, 15.45, 15.46, 15.80, 14.37, 15.69, 15.76],
    'Centro-Oeste': [10.43, 10.71, 11.27, 11.59, 11.14, 10.69, 11.04, 11.29, 10.34, 10.57, 10.04, 10.69],
    'Sudeste':      [47.06, 49.24, 48.08, 47.53, 48.72, 49.39, 48.17, 47.63, 47.60, 48.04, 48.11, 45.73],
    'Sul':          [18.92, 18.71, 18.53, 18.49, 18.81, 18.34, 19.25, 18.98, 18.10, 19.95, 18.91, 19.98],
  },
  automovel_comercial_leve: {
    'Norte':        [4.49, 4.44, 4.62, 4.63, 4.61, 4.46, 4.17, 4.43, 5.04, 4.22, 4.50, 4.81],
    'Nordeste':     [17.04, 16.11, 14.90, 14.65, 14.94, 14.32, 15.05, 15.37, 15.29, 14.25, 14.43, 15.12],
    'Centro-Oeste': [10.08, 10.03, 9.97, 10.13, 9.89, 9.48, 9.57, 9.66, 9.09, 9.43, 8.92, 9.35],
    'Sudeste':      [49.45, 51.03, 51.40, 51.81, 51.45, 52.46, 51.63, 50.98, 51.72, 52.05, 53.07, 49.70],
    'Sul':          [18.94, 18.40, 19.11, 18.78, 19.11, 18.98, 19.58, 19.55, 18.79, 20.05, 19.09, 21.03],
  },
};

// FENABRAVE 2016 seed data
const FENABRAVE_2016_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.56, 4.79, 4.42, 4.46, 4.14, 4.26, 4.10, 3.97, 3.50, 3.44, 3.60, 4.16],
    'Nordeste':     [17.36, 15.72, 14.88, 16.74, 15.35, 14.85, 14.74, 14.91, 14.33, 13.99, 13.83, 15.98],
    'Centro-Oeste': [10.10, 10.22, 9.26, 8.88, 8.70, 8.35, 8.59, 8.74, 8.40, 8.55, 8.01, 8.66],
    'Sudeste':      [49.04, 51.76, 52.11, 52.65, 53.92, 54.17, 54.53, 54.94, 56.10, 56.71, 57.59, 52.40],
    'Sul':          [18.94, 17.52, 19.34, 17.28, 17.89, 18.36, 18.04, 17.43, 17.66, 17.32, 16.97, 18.79],
  },
  comercial_leve: {
    'Norte':        [7.53, 8.43, 7.97, 7.32, 7.85, 7.79, 7.59, 7.34, 8.05, 7.79, 8.17, 8.37],
    'Nordeste':     [20.34, 17.97, 16.60, 16.88, 16.17, 16.06, 15.27, 17.36, 15.77, 15.91, 15.60, 17.32],
    'Centro-Oeste': [12.00, 12.34, 13.46, 12.78, 12.52, 12.22, 11.08, 13.52, 12.28, 11.05, 11.53, 12.64],
    'Sudeste':      [39.42, 41.05, 41.47, 40.42, 42.53, 43.35, 43.99, 41.72, 43.15, 44.74, 45.08, 40.43],
    'Sul':          [20.90, 20.21, 20.50, 22.60, 20.92, 20.58, 20.07, 19.56, 20.76, 20.50, 19.62, 21.23],
  },
  automovel_comercial_leve: {
    'Norte':        [4.93, 5.28, 4.94, 4.92, 4.71, 4.81, 4.66, 4.60, 4.21, 4.07, 4.26, 4.78],
    'Nordeste':     [17.71, 16.02, 15.14, 16.76, 15.47, 15.05, 14.83, 15.31, 14.35, 14.27, 14.09, 16.18],
    'Centro-Oeste': [10.31, 10.51, 9.88, 9.51, 9.28, 8.98, 9.12, 9.52, 9.00, 8.91, 8.51, 9.24],
    'Sudeste':      [47.85, 50.30, 50.54, 50.67, 52.18, 52.43, 52.83, 52.77, 54.10, 54.97, 55.80, 50.66],
    'Sul':          [19.19, 17.89, 19.51, 18.14, 18.35, 18.71, 18.37, 17.79, 18.14, 17.78, 17.35, 19.15],
  },
};

// FENABRAVE 2017 seed data
const FENABRAVE_2017_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.06, 4.32, 4.09, 3.98, 3.98, 3.90, 3.50, 4.07, 3.80, 4.44, 4.04, 4.88],
    'Nordeste':     [16.88, 15.02, 14.81, 15.23, 14.90, 14.39, 15.50, 14.65, 14.19, 14.64, 14.16, 15.75],
    'Centro-Oeste': [9.87, 9.44, 8.88, 8.39, 8.37, 8.49, 8.45, 8.20, 7.61, 8.31, 7.89, 8.90],
    'Sudeste':      [49.80, 53.72, 54.76, 55.56, 56.01, 57.12, 54.82, 56.80, 58.81, 55.40, 56.18, 51.55],
    'Sul':          [19.40, 17.50, 17.46, 16.84, 16.73, 16.10, 17.27, 16.27, 15.59, 17.21, 17.53, 18.92],
  },
  comercial_leve: {
    'Norte':        [7.00, 7.30, 8.67, 8.63, 8.46, 8.92, 8.64, 8.76, 8.45, 7.97, 8.24, 9.41],
    'Nordeste':     [16.97, 17.00, 16.33, 16.71, 16.34, 14.57, 16.51, 17.97, 16.20, 15.18, 15.79, 16.26],
    'Centro-Oeste': [12.30, 12.07, 12.98, 12.54, 13.10, 11.92, 11.89, 12.78, 11.30, 10.93, 11.44, 13.34],
    'Sudeste':      [41.27, 44.18, 43.13, 42.71, 42.61, 46.03, 45.41, 42.56, 43.17, 45.65, 43.96, 39.46],
    'Sul':          [22.46, 19.45, 18.89, 19.41, 19.49, 18.56, 17.55, 17.93, 20.88, 20.26, 20.57, 21.53],
  },
  automovel_comercial_leve: {
    'Norte':        [4.51, 4.77, 4.73, 4.62, 4.61, 4.45, 4.67, 4.72, 4.41, 4.97, 4.65, 5.61],
    'Nordeste':     [16.89, 15.32, 15.02, 15.43, 15.10, 14.42, 15.65, 15.11, 14.46, 14.72, 14.39, 15.83],
    'Centro-Oeste': [10.24, 9.84, 9.46, 8.96, 9.04, 8.99, 8.98, 8.83, 8.10, 8.71, 8.40, 9.61],
    'Sudeste':      [48.48, 52.28, 53.13, 53.80, 54.12, 55.48, 53.39, 54.83, 56.75, 53.92, 54.59, 49.61],
    'Sul':          [19.87, 17.80, 17.66, 17.19, 17.12, 16.47, 17.31, 16.50, 16.29, 17.68, 17.97, 19.34],
  },
};

// FENABRAVE 2018 seed data
const FENABRAVE_2018_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.63, 4.40, 4.20, 4.17, 5.18, 4.52, 4.36, 4.40, 4.24, 3.99, 4.19, 4.75],
    'Nordeste':     [16.35, 14.75, 14.67, 14.33, 15.29, 13.45, 14.59, 14.28, 13.63, 12.96, 13.81, 14.53],
    'Centro-Oeste': [9.88, 9.81, 8.82, 9.10, 9.23, 8.57, 8.75, 8.61, 8.14, 8.30, 8.19, 9.17],
    'Sudeste':      [50.30, 52.89, 54.49, 54.90, 52.73, 57.15, 55.08, 56.28, 57.71, 58.68, 56.53, 52.23],
    'Sul':          [18.84, 18.15, 17.82, 17.50, 17.58, 16.30, 17.21, 16.44, 16.28, 16.11, 17.28, 19.33],
  },
  comercial_leve: {
    'Norte':        [8.68, 9.05, 7.67, 7.69, 8.82, 7.59, 9.71, 8.79, 8.48, 7.99, 9.19, 8.63],
    'Nordeste':     [17.29, 15.84, 17.24, 16.17, 15.92, 15.01, 16.81, 15.70, 14.72, 15.18, 16.49, 16.00],
    'Centro-Oeste': [11.97, 13.65, 14.24, 13.87, 14.67, 14.01, 12.55, 12.31, 11.54, 12.01, 12.62, 13.07],
    'Sudeste':      [42.42, 41.60, 41.67, 41.56, 41.61, 44.51, 42.71, 45.38, 44.24, 45.15, 42.22, 42.41],
    'Sul':          [19.64, 19.86, 19.18, 20.71, 18.97, 18.88, 18.22, 17.82, 21.01, 19.71, 19.47, 19.90],
  },
  automovel_comercial_leve: {
    'Norte':        [5.24, 5.07, 4.67, 4.69, 5.75, 5.02, 5.19, 5.05, 4.90, 4.54, 4.85, 5.37],
    'Nordeste':     [16.49, 14.90, 15.02, 14.60, 15.39, 13.71, 14.93, 14.49, 13.80, 13.29, 14.16, 14.76],
    'Centro-Oeste': [10.20, 10.36, 9.56, 9.80, 10.08, 9.45, 9.35, 9.15, 8.66, 8.84, 8.78, 9.78],
    'Sudeste':      [49.11, 51.26, 52.74, 52.92, 50.99, 55.11, 53.16, 54.67, 55.64, 56.69, 54.63, 50.67],
    'Sul':          [18.96, 18.40, 18.01, 17.98, 17.80, 16.72, 17.37, 16.64, 17.00, 16.64, 17.57, 19.42],
  },
};

// FENABRAVE 2012 seed data
const FENABRAVE_2012_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [3.60, 4.01, 4.01, 3.84, 3.85, 3.89, 4.22, 4.03, 1.91, 4.12, 3.95, 4.57],
    'Nordeste':     [15.95, 14.77, 14.68, 15.03, 14.59, 15.56, 15.70, 15.79, 15.65, 15.30, 15.86, 16.02],
    'Centro-Oeste': [9.94, 10.11, 9.50, 9.03, 9.39, 9.53, 9.78, 9.75, 9.66, 9.68, 9.73, 10.14],
    'Sudeste':      [50.28, 51.55, 52.09, 51.26, 52.73, 50.92, 50.73, 50.85, 52.57, 50.60, 50.55, 49.35],
    'Sul':          [20.23, 19.55, 19.72, 20.84, 19.44, 19.99, 19.57, 18.18, 20.29, 19.91, 19.92, 19.92],
  },
  comercial_leve: {
    'Norte':        [6.42, 6.02, 5.79, 6.48, 6.35, 6.78, 6.94, 6.21, 6.48, 6.11, 6.58, 7.26],
    'Nordeste':     [17.14, 15.47, 15.87, 15.81, 16.58, 16.33, 16.31, 17.09, 16.06, 16.28, 17.60, 16.64],
    'Centro-Oeste': [10.39, 10.80, 11.00, 10.72, 11.64, 12.28, 11.57, 11.69, 11.43, 12.10, 12.15, 13.26],
    'Sudeste':      [46.68, 48.92, 49.41, 46.14, 46.55, 44.31, 44.44, 44.59, 46.62, 45.90, 43.85, 42.18],
    'Sul':          [19.37, 18.78, 17.92, 20.85, 18.88, 20.30, 20.74, 20.42, 19.42, 19.61, 19.82, 20.66],
  },
  automovel_comercial_leve: {
    'Norte':        [4.01, 4.30, 4.28, 4.24, 4.24, 4.24, 4.59, 4.32, 4.32, 4.42, 4.33, 4.95],
    'Nordeste':     [16.12, 14.87, 14.86, 15.15, 14.90, 15.74, 15.78, 15.96, 15.72, 15.45, 16.11, 16.11],
    'Centro-Oeste': [10.01, 10.21, 9.73, 9.29, 9.74, 9.87, 10.02, 10.01, 9.93, 10.05, 10.08, 10.58],
    'Sudeste':      [49.75, 51.17, 51.68, 50.49, 51.77, 50.12, 49.88, 50.03, 51.66, 49.89, 49.59, 48.34],
    'Sul':          [20.11, 19.44, 19.45, 20.84, 19.35, 20.03, 19.73, 19.69, 18.37, 20.19, 19.89, 20.02],
  },
};

// FENABRAVE 2013 seed data
const FENABRAVE_2013_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [3.04, 4.40, 4.02, 4.22, 4.03, 4.10, 4.18, 4.02, 3.94, 4.06, 3.95, 4.37],
    'Nordeste':     [16.69, 15.54, 15.38, 15.58, 14.28, 15.72, 15.13, 14.74, 14.01, 15.05, 15.85, 15.85],
    'Centro-Oeste': [10.22, 10.25, 10.01, 9.78, 9.63, 9.79, 10.08, 9.80, 9.49, 9.17, 9.53, 10.07],
    'Sudeste':      [49.90, 50.94, 50.74, 50.28, 51.06, 52.46, 49.79, 51.23, 51.66, 51.13, 50.96, 47.67],
    'Sul':          [19.25, 18.88, 19.85, 20.14, 19.90, 19.36, 20.23, 19.83, 20.16, 21.63, 20.51, 22.04],
  },
  comercial_leve: {
    'Norte':        [6.61, 5.97, 6.15, 6.98, 6.04, 6.64, 6.78, 6.69, 5.95, 6.72, 6.24, 6.94],
    'Nordeste':     [18.05, 16.67, 16.62, 16.89, 16.84, 15.12, 16.81, 16.71, 15.43, 16.06, 15.84, 16.31],
    'Centro-Oeste': [12.77, 12.00, 12.07, 11.86, 12.25, 13.02, 12.78, 12.02, 11.60, 10.66, 10.71, 12.14],
    'Sudeste':      [42.52, 43.80, 44.61, 43.44, 43.58, 43.30, 42.98, 43.61, 44.48, 44.32, 45.71, 41.32],
    'Sul':          [20.04, 21.56, 20.55, 20.83, 21.30, 21.91, 20.65, 20.97, 22.53, 22.24, 21.49, 23.29],
  },
  automovel_comercial_leve: {
    'Norte':        [4.33, 4.65, 4.34, 4.62, 4.32, 4.49, 4.57, 4.41, 4.29, 4.46, 4.27, 4.74],
    'Nordeste':     [16.89, 15.72, 15.57, 15.77, 15.60, 14.41, 15.88, 15.36, 14.86, 14.31, 15.16, 15.91],
    'Centro-Oeste': [10.60, 10.53, 10.33, 10.08, 10.01, 10.29, 10.48, 10.13, 9.84, 9.39, 9.69, 10.37],
    'Sudeste':      [48.82, 49.81, 49.80, 49.28, 49.96, 51.06, 48.78, 50.10, 50.49, 50.12, 50.22, 46.76],
    'Sul':          [19.36, 19.30, 19.96, 20.24, 20.11, 19.75, 20.29, 20.00, 20.55, 21.72, 20.65, 22.22],
  },
};

// FENABRAVE 2014 seed data
const FENABRAVE_2014_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.08, 4.08, 4.26, 3.94, 4.47, 4.35, 4.99, 4.48, 4.34, 3.09, 4.40, 4.58],
    'Nordeste':     [16.71, 16.11, 15.25, 15.31, 15.99, 15.84, 16.89, 16.22, 16.01, 15.43, 15.71, 16.57],
    'Centro-Oeste': [10.29, 10.25, 9.71, 9.82, 9.20, 9.36, 9.89, 9.55, 9.58, 8.90, 8.90, 8.67],
    'Sudeste':      [48.97, 50.13, 50.61, 52.00, 50.44, 51.25, 48.37, 50.01, 49.20, 52.04, 51.04, 48.57],
    'Sul':          [19.95, 19.43, 20.04, 18.93, 19.90, 19.21, 19.85, 19.73, 20.88, 19.63, 19.95, 21.61],
  },
  comercial_leve: {
    'Norte':        [6.42, 6.20, 6.98, 6.47, 7.14, 6.95, 7.71, 7.40, 7.25, 7.54, 7.56, 9.00],
    'Nordeste':     [18.43, 17.99, 17.69, 17.75, 16.37, 16.05, 16.83, 18.05, 16.78, 16.51, 17.01, 18.43],
    'Centro-Oeste': [10.94, 11.84, 12.55, 12.03, 12.22, 12.40, 12.40, 12.08, 12.09, 11.42, 10.85, 11.36],
    'Sudeste':      [43.29, 42.71, 41.19, 42.51, 42.22, 42.05, 40.50, 41.11, 41.80, 42.54, 42.37, 39.13],
    'Sul':          [20.92, 21.27, 21.60, 21.25, 22.05, 22.55, 22.56, 21.36, 22.08, 21.98, 22.22, 22.09],
  },
  automovel_comercial_leve: {
    'Norte':        [4.43, 4.44, 4.72, 4.34, 4.90, 4.75, 5.41, 4.95, 4.83, 4.58, 4.91, 5.21],
    'Nordeste':     [16.96, 16.43, 15.75, 15.70, 16.05, 15.87, 16.88, 16.52, 16.14, 15.61, 15.92, 16.83],
    'Centro-Oeste': [10.39, 10.52, 10.19, 10.17, 9.69, 9.83, 10.30, 9.96, 10.01, 9.32, 9.21, 9.05],
    'Sudeste':      [48.13, 48.87, 49.03, 50.48, 49.10, 49.81, 47.10, 48.57, 47.94, 50.46, 49.65, 47.22],
    'Sul':          [20.09, 19.74, 20.31, 19.30, 20.25, 19.73, 20.29, 20.00, 21.08, 20.02, 20.32, 21.68],
  },
};

// FENABRAVE 2015 seed data
const FENABRAVE_2015_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.74, 4.95, 4.84, 4.73, 4.76, 4.86, 4.90, 4.48, 4.47, 3.37, 4.22, 4.45],
    'Nordeste':     [18.52, 16.75, 16.59, 16.50, 16.44, 16.29, 16.97, 16.23, 16.38, 14.44, 13.14, 15.75],
    'Centro-Oeste': [9.97, 10.65, 9.92, 9.40, 9.61, 9.96, 9.57, 9.29, 8.99, 8.14, 8.13, 8.92],
    'Sudeste':      [48.22, 49.35, 49.22, 50.91, 50.94, 51.13, 51.67, 52.01, 52.05, 53.81, 54.79, 50.34],
    'Sul':          [18.54, 18.32, 19.42, 18.47, 18.26, 17.56, 16.89, 17.98, 18.10, 19.65, 17.72, 20.55],
  },
  comercial_leve: {
    'Norte':        [8.01, 8.23, 8.31, 9.04, 8.33, 8.37, 8.93, 8.98, 9.06, 8.75, 8.86, 9.28],
    'Nordeste':     [19.37, 18.72, 18.25, 17.54, 16.84, 17.07, 17.87, 17.57, 16.84, 16.13, 16.28, 16.96],
    'Centro-Oeste': [12.39, 12.69, 13.01, 13.24, 14.69, 13.96, 12.34, 11.87, 11.17, 10.26, 11.11, 12.43],
    'Sudeste':      [40.21, 41.52, 41.32, 40.02, 40.60, 40.19, 41.62, 41.31, 41.11, 41.18, 42.71, 41.43],
    'Sul':          [20.02, 18.85, 19.09, 20.16, 19.04, 20.40, 19.24, 20.28, 21.81, 23.68, 21.04, 19.91],
  },
  automovel_comercial_leve: {
    'Norte':        [5.25, 5.48, 5.40, 5.39, 5.34, 5.36, 5.49, 5.09, 5.10, 4.58, 4.79, 5.05],
    'Nordeste':     [18.65, 17.07, 16.86, 16.66, 16.50, 16.40, 17.10, 16.42, 16.44, 14.65, 13.28, 15.90],
    'Centro-Oeste': [10.35, 10.98, 10.42, 9.98, 10.34, 10.51, 9.98, 9.65, 9.29, 8.41, 8.50, 9.35],
    'Sudeste':      [46.98, 48.08, 47.96, 49.25, 49.46, 49.74, 50.18, 50.55, 50.36, 52.19, 53.30, 49.23],
    'Sul':          [18.77, 18.40, 19.37, 18.73, 18.37, 17.97, 17.24, 18.29, 18.61, 20.17, 18.13, 20.47],
  },
};

// FENABRAVE 2019 seed data
const FENABRAVE_2019_SEED: Record<string, Record<string, number[]>> = {
  automovel: {
    'Norte':        [4.49, 4.54, 4.18, 4.27, 4.28, 4.52, 4.85, 4.85, 4.94, 4.30, 4.18, 4.97],
    'Nordeste':     [16.30, 14.84, 13.10, 13.53, 13.66, 13.12, 14.49, 14.46, 14.17, 14.22, 13.37, 14.47],
    'Centro-Oeste': [9.03, 8.92, 8.22, 8.22, 8.26, 8.26, 8.73, 9.14, 8.08, 8.68, 7.70, 8.87],
    'Sudeste':      [52.39, 56.17, 59.35, 58.14, 58.40, 58.31, 55.39, 54.96, 56.91, 55.41, 57.95, 52.07],
    'Sul':          [17.79, 15.33, 15.15, 15.84, 15.31, 15.83, 16.53, 16.60, 15.90, 17.40, 16.80, 19.73],
  },
  comercial_leve: {
    'Norte':        [8.60, 8.06, 7.92, 8.14, 8.17, 8.89, 8.68, 8.53, 7.56, 8.37, 8.23, 10.20],
    'Nordeste':     [17.23, 16.33, 15.05, 15.48, 14.76, 15.01, 16.45, 15.42, 15.05, 15.41, 14.71, 15.89],
    'Centro-Oeste': [12.75, 13.38, 13.00, 14.15, 13.57, 12.71, 12.75, 11.82, 11.01, 11.23, 10.82, 12.95],
    'Sudeste':      [41.98, 44.74, 45.18, 41.54, 45.10, 47.36, 45.32, 47.11, 45.67, 44.65, 48.42, 40.99],
    'Sul':          [19.43, 17.49, 18.85, 20.70, 18.40, 16.03, 16.80, 17.12, 20.71, 20.35, 17.82, 19.97],
  },
  automovel_comercial_leve: {
    'Norte':        [5.07, 5.06, 4.71, 4.84, 4.94, 5.11, 5.45, 5.40, 5.36, 4.92, 4.78, 5.64],
    'Nordeste':     [16.44, 15.05, 13.38, 13.82, 13.83, 13.41, 14.80, 14.61, 14.31, 14.40, 13.57, 14.67],
    'Centro-Oeste': [9.55, 9.57, 8.92, 9.08, 9.06, 8.91, 9.36, 9.54, 8.54, 9.06, 8.16, 9.46],
    'Sudeste':      [50.92, 54.53, 57.28, 55.72, 56.39, 56.66, 53.81, 53.77, 55.13, 53.77, 56.54, 50.46],
    'Sul':          [18.02, 15.81, 15.69, 16.54, 15.78, 15.86, 16.57, 16.68, 16.66, 17.85, 16.95, 19.76],
  },
};

export function RegionalAnalysisTab({ readOnly = false }: RegionalAnalysisTabProps) {
  const [data, setData] = useState<RegionalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('automovel');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async (preferredYear?: number) => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('fleet_regional_data')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: true })
      .order('region', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar dados regionais');
      setLoading(false);
      return;
    }

    const items = (rows || []) as RegionalData[];
    const uniqueYears = [...new Set([...items.map(r => r.year), ...BUILTIN_YEAR_OPTIONS])].sort((a, b) => b - a);

    setData(items);
    setYears(uniqueYears);
    setSelectedYear(prev => {
      if (preferredYear && uniqueYears.includes(preferredYear)) return String(preferredYear);
      if (prev && uniqueYears.includes(Number(prev))) return prev;
      return uniqueYears.length > 0 ? String(uniqueYears[0]) : '';
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (selectedYear) filtered = filtered.filter(r => r.year === Number(selectedYear));
    if (selectedType) filtered = filtered.filter(r => r.vehicle_type === selectedType);

    if (filtered.length === 0 && selectedYear === '2010' && FENABRAVE_2010_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2010_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2010-${selectedType}-${region}-${index + 1}`,
          year: 2010,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2011' && FENABRAVE_2011_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2011_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2011-${selectedType}-${region}-${index + 1}`,
          year: 2011,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2012' && FENABRAVE_2012_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2012_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2012-${selectedType}-${region}-${index + 1}`,
          year: 2012,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2013' && FENABRAVE_2013_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2013_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2013-${selectedType}-${region}-${index + 1}`,
          year: 2013,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2014' && FENABRAVE_2014_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2014_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2014-${selectedType}-${region}-${index + 1}`,
          year: 2014,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2015' && FENABRAVE_2015_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2015_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2015-${selectedType}-${region}-${index + 1}`,
          year: 2015,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2016' && FENABRAVE_2016_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2016_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2016-${selectedType}-${region}-${index + 1}`,
          year: 2016,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2017' && FENABRAVE_2017_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2017_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2017-${selectedType}-${region}-${index + 1}`,
          year: 2017,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    if (filtered.length === 0 && selectedYear === '2018' && FENABRAVE_2018_SEED[selectedType]) {
      return REGIONS.flatMap(region =>
        FENABRAVE_2018_SEED[selectedType][region].map((percentage, index) => ({
          id: `seed-2018-${selectedType}-${region}-${index + 1}`,
          year: 2018,
          month: index + 1,
          region,
          vehicle_type: selectedType,
          quantity: 0,
          percentage,
        }))
      );
    }

    return filtered;
  }, [data, selectedYear, selectedType]);

  // Monthly stacked chart data (like FENABRAVE)
  const monthlyChartData = useMemo(() => {
    const hasMonthly = filteredData.some(r => r.month !== null);
    if (!hasMonthly) return [];
    return MONTHS.map((label, idx) => {
      const monthNum = idx + 1;
      const monthRows = filteredData.filter(r => r.month === monthNum);
      const row: Record<string, any> = { month: label };
      REGIONS.forEach(region => {
        const match = monthRows.find(r => r.region === region);
        row[region] = match ? match.percentage : 0;
      });
      return row;
    }).filter(r => REGIONS.some(reg => r[reg] > 0));
  }, [filteredData]);

  // Annual summary (aggregate)
  const regionSummary = useMemo(() => {
    const map: Record<string, { quantity: number; percentage: number; count: number }> = {};
    filteredData.forEach(r => {
      if (!map[r.region]) map[r.region] = { quantity: 0, percentage: 0, count: 0 };
      map[r.region].quantity += r.quantity;
      map[r.region].percentage += r.percentage;
      map[r.region].count += 1;
    });
    return REGIONS.map(region => {
      const d = map[region];
      if (!d) return { region, quantity: 0, avgPercentage: 0 };
      return {
        region,
        quantity: d.quantity,
        avgPercentage: d.count > 0 ? d.percentage / d.count : 0,
      };
    }).filter(r => r.quantity > 0 || r.avgPercentage > 0);
  }, [filteredData]);

  const totalQuantity = useMemo(() => regionSummary.reduce((s, r) => s + r.quantity, 0), [regionSummary]);

  // Multi-year comparison — includes seed/fallback data for years without DB records
  const multiYearData = useMemo(() => {
    if (!selectedType) return [];

    const SEED_MAP: Record<number, Record<string, Record<string, number[]>>> = {
      2018: FENABRAVE_2018_SEED,
      2017: FENABRAVE_2017_SEED,
      2016: FENABRAVE_2016_SEED,
      2015: FENABRAVE_2015_SEED,
      2014: FENABRAVE_2014_SEED,
      2013: FENABRAVE_2013_SEED,
      2012: FENABRAVE_2012_SEED,
      2011: FENABRAVE_2011_SEED,
      2010: FENABRAVE_2010_SEED,
    };

    const typeData = data.filter(r => r.vehicle_type === selectedType);
    const dbYears = new Set(typeData.map(r => r.year));
    const allYears = [...new Set([...dbYears, ...BUILTIN_YEAR_OPTIONS])].sort();

    return allYears.map(year => {
      const yearData = typeData.filter(r => r.year === year);
      const row: Record<string, any> = { year };

      if (yearData.length > 0) {
        REGIONS.forEach(region => {
          const regionRows = yearData.filter(r => r.region === region);
          if (regionRows.length > 0) {
            const avg = regionRows.reduce((s, r) => s + r.percentage, 0) / regionRows.length;
            row[region] = Number(avg.toFixed(2));
          }
        });
      } else if (SEED_MAP[year]?.[selectedType]) {
        const seed = SEED_MAP[year][selectedType];
        REGIONS.forEach(region => {
          if (seed[region]) {
            const avg = seed[region].reduce((s, v) => s + v, 0) / seed[region].length;
            row[region] = Number(avg.toFixed(2));
          }
        });
      }

      return row;
    });
  }, [data, selectedType]);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV vazio'); setImporting(false); return; }

      const yearInput = prompt('Qual o ANO dos dados? (ex: 2016)');
      if (!yearInput || isNaN(Number(yearInput))) { toast.error('Ano inválido'); setImporting(false); return; }
      const year = Number(yearInput);

      const typeInput = prompt('Tipo:\n1 = Automóveis\n2 = Comerciais Leves\n3 = Automóveis + Comerciais Leves');
      let vehicleType = 'automovel';
      if (typeInput === '2') vehicleType = 'comercial_leve';
      else if (typeInput === '3') vehicleType = 'automovel_comercial_leve';

      await supabase.from('fleet_regional_data').delete().eq('year', year).eq('vehicle_type', vehicleType);

      const hasHeader = lines[0].toLowerCase().includes('regiao') || lines[0].toLowerCase().includes('region');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const rows: { year: number; month: number | null; region: string; vehicle_type: string; quantity: number; percentage: number }[] = [];

      for (const line of dataLines) {
        const parts = line.split(/[,;\t]/).map(s => s.trim().replace(/"/g, ''));
        if (parts.length < 2) continue;
        const region = parts[0];
        if (!REGIONS.some(r => r.toLowerCase() === region.toLowerCase())) continue;
        const matchedRegion = REGIONS.find(r => r.toLowerCase() === region.toLowerCase()) || region;

        if (parts.length >= 13) {
          for (let m = 0; m < 12; m++) {
            const pct = parseFloat(parts[m + 1]?.replace(',', '.') || '0');
            if (pct > 0) {
              rows.push({ year, month: m + 1, region: matchedRegion, vehicle_type: vehicleType, quantity: 0, percentage: pct });
            }
          }
        } else {
          const qty = parseInt(parts[1]?.replace(/\./g, '').replace(/,/g, '') || '0');
          const pct = parseFloat(parts[2]?.replace(',', '.') || '0');
          rows.push({ year, month: null, region: matchedRegion, vehicle_type: vehicleType, quantity: qty, percentage: pct });
        }
      }

      if (!rows.length) { toast.error('Nenhum dado válido encontrado'); setImporting(false); return; }

      const { error } = await supabase.from('fleet_regional_data').insert(rows);
      if (error) throw error;
      setSelectedType(vehicleType);
      toast.success(`${rows.length} registros importados para ${year} (${VEHICLE_TYPES.find(v => v.value === vehicleType)?.label})`);
      await fetchData(year);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteYear = async (year: number) => {
    if (!confirm(`Excluir todos os dados regionais de ${year}?`)) return;
    await supabase.from('fleet_regional_data').delete().eq('year', year);
    toast.success(`Dados regionais de ${year} excluídos`);
    await fetchData();
  };

  const handleSeedFenabrave = async (year: number, seedData: Record<string, Record<string, number[]>>) => {
    if (!confirm(`Carregar dados FENABRAVE ${year} (Automóveis, Comerciais Leves e Combinados)?`)) return;
    setImporting(true);
    try {
      await supabase.from('fleet_regional_data').delete().eq('year', year);
      const rows: { year: number; month: number; region: string; vehicle_type: string; quantity: number; percentage: number }[] = [];
      for (const [vtype, regions] of Object.entries(seedData)) {
        for (const [region, months] of Object.entries(regions)) {
          months.forEach((pct, idx) => {
            rows.push({ year, month: idx + 1, region, vehicle_type: vtype, quantity: 0, percentage: pct });
          });
        }
      }
      const { error } = await supabase.from('fleet_regional_data').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} registros FENABRAVE ${year} carregados!`);
      await fetchData(year);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setImporting(false);
  };

  const handleDownloadTemplate = () => {
    const bom = '\uFEFF';
    const csv = bom +
      '# MODELO 1 - Dados MENSAIS por região (percentual por mês)\n' +
      '# Use este formato para dados como o relatório FENABRAVE\n' +
      'regiao;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n' +
      'Norte;4.56;4.79;4.42;4.46;4.14;4.26;4.10;3.97;3.50;3.44;3.60;4.16\n' +
      'Nordeste;17.36;15.72;14.88;16.74;15.15;14.85;14.85;14.91;14.33;13.99;13.83;15.08\n' +
      'Centro-Oeste;9.14;10.22;9.26;8.88;8.70;8.35;8.59;8.74;8.40;8.55;8.01;8.66\n' +
      'Sudeste;49.04;51.76;52.11;52.65;53.92;54.17;54.33;54.94;56.10;56.71;57.59;52.40\n' +
      'Sul;18.94;17.52;19.34;17.28;17.89;18.36;18.04;17.43;17.66;17.32;16.97;18.79\n' +
      '\n' +
      '# MODELO 2 - Dados ANUAIS por região (quantidade e percentual)\n' +
      '# regiao;quantidade;percentual\n' +
      '# Norte;50000;5.2\n' +
      '# Nordeste;150000;15.8\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_regional_fenabrave.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Modelo CSV baixado!');
  };

  const handleExportExcel = () => {
    if (filteredData.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    const rows = filteredData.map(r => ({
      'Região': r.region,
      'Ano': r.year,
      'Mês': r.month ? MONTHS[r.month - 1] : 'Anual',
      'Tipo': VEHICLE_TYPES.find(v => v.value === r.vehicle_type)?.label || r.vehicle_type,
      'Quantidade': r.quantity,
      'Participação (%)': r.percentage,
    }));
    exportToExcel(rows, `regional_${selectedType}_${selectedYear || 'todos'}`, 'Regional');
    toast.success('Excel exportado!');
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 font-semibold text-primary hover:bg-primary/10">
                <Settings className="w-4 h-4" />
                ⚙️ Importar Dados Regionais (FENABRAVE)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 space-y-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Formato CSV mensal:</strong> região;Jan;Fev;...;Dez (percentuais)<br />
                  <strong>Formato CSV anual:</strong> região;quantidade;percentual<br />
                  <strong>Tipos:</strong> Automóveis, Comerciais Leves, Automóveis + Comerciais Leves
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCSV} />
                  <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                    <FileSpreadsheet className="w-4 h-4 mr-1" /> Modelo CSV
                  </Button>
                  <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
                    {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    Importar CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportExcel}>
                    <Download className="w-4 h-4 mr-1" /> Exportar Excel
                  </Button>
                  {selectedYear && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteYear(Number(selectedYear))}>
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir {selectedYear}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2010, FENABRAVE_2010_SEED)} disabled={importing}>
                    📊 FENABRAVE 2010
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2011, FENABRAVE_2011_SEED)} disabled={importing}>
                    📊 FENABRAVE 2011
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2012, FENABRAVE_2012_SEED)} disabled={importing}>
                    📊 FENABRAVE 2012
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2013, FENABRAVE_2013_SEED)} disabled={importing}>
                    📊 FENABRAVE 2013
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2014, FENABRAVE_2014_SEED)} disabled={importing}>
                    📊 FENABRAVE 2014
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2015, FENABRAVE_2015_SEED)} disabled={importing}>
                    📊 FENABRAVE 2015
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2016, FENABRAVE_2016_SEED)} disabled={importing}>
                    📊 FENABRAVE 2016
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSeedFenabrave(2017, FENABRAVE_2017_SEED)} disabled={importing}>
                    📊 FENABRAVE 2017
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {regionSummary.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum dado regional para este filtro. Importe um CSV com dados FENABRAVE.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {regionSummary.map(r => (
              <Card key={r.region} className="p-3 text-center" style={{ borderLeftColor: REGION_COLORS[r.region], borderLeftWidth: 4 }}>
                <p className="text-xs text-muted-foreground font-medium">{r.region}</p>
                <p className="text-lg font-bold">
                  {r.avgPercentage > 0 ? `${r.avgPercentage.toFixed(1)}%` : r.quantity.toLocaleString('pt-BR')}
                </p>
                {r.quantity > 0 && totalQuantity > 0 && (
                  <p className="text-xs text-muted-foreground">{((r.quantity / totalQuantity) * 100).toFixed(1)}% do total</p>
                )}
              </Card>
            ))}
          </div>

          {/* Monthly stacked bar chart (FENABRAVE style) */}
          {monthlyChartData.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Emplacamentos por Região — {VEHICLE_TYPES.find(v => v.value === selectedType)?.label} ({selectedYear})
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyChartData} stackOffset="expand" barCategoryGap="8%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const pct = typeof value === 'number' ? value : 0;
                      return [`${(pct * 100).toFixed(2)}%`, name];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  {REGIONS.map(region => (
                    <Bar key={region} dataKey={region} stackId="a" fill={REGION_COLORS[region]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Monthly data table */}
          {monthlyChartData.length > 0 && (
            <Card className="p-4 overflow-x-auto">
              <h3 className="font-semibold mb-3">📊 Participação Mensal (%) — {selectedYear}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Região</TableHead>
                    {MONTHS.map(m => <TableHead key={m} className="text-center text-xs px-1">{m}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REGIONS.map(region => {
                    const regionRows = filteredData.filter(r => r.region === region && r.month !== null);
                    if (regionRows.length === 0) return null;
                    return (
                      <TableRow key={region}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: REGION_COLORS[region] }} />
                            <span className="font-medium text-sm">{region}</span>
                          </div>
                        </TableCell>
                        {MONTHS.map((_, idx) => {
                          const row = regionRows.find(r => r.month === idx + 1);
                          return (
                            <TableCell key={idx} className="text-center text-xs font-mono px-1">
                              {row ? row.percentage.toFixed(2) : '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Multi-year comparison */}
          {multiYearData.length > 1 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">📈 Evolução Regional por Ano — {VEHICLE_TYPES.find(v => v.value === selectedType)?.label}</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={multiYearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend />
                  {REGIONS.map(region => (
                    <Bar key={region} dataKey={region} fill={REGION_COLORS[region]} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Insights */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2">💡 Insights Regionais</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {(() => {
                const sorted = [...regionSummary].sort((a, b) => b.avgPercentage - a.avgPercentage);
                const top = sorted[0];
                const bottom = sorted[sorted.length - 1];
                return (
                  <>
                    <li>🏆 <strong>{top.region}</strong> lidera com média de {top.avgPercentage.toFixed(1)}% de participação</li>
                    <li>📉 <strong>{bottom.region}</strong> tem menor participação — oportunidade de expansão</li>
                    <li>🎯 Concentre estoque nos modelos mais emplacados na região <strong>{top.region}</strong></li>
                    <li>🚀 Explore parcerias na região <strong>{bottom.region}</strong> para diversificar vendas</li>
                  </>
                );
              })()}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

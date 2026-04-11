import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Upload, Loader2, Trash2, Car, TrendingUp, AlertTriangle, Package, Search, Download, FileSpreadsheet, Settings } from 'lucide-react';
import { MaintenanceCycleTab } from './fleet/MaintenanceCycleTab';
import { MultiYearTrendTab } from './fleet/MultiYearTrendTab';
import { RegionalAnalysisTab } from './fleet/RegionalAnalysisTab';
import { MarketPotentialTab } from './fleet/MarketPotentialTab';
import { getFleetModelKeywords, itemMatchesFleetModel, loadFleetAnalysisItems, normalizeFleetText } from './fleet/fleetAnalysisData';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface FleetRanking {
  id: string;
  year: number;
  position: number;
  model: string;
  quantity: number;
  vehicle_type: string;
}

interface FleetRankingsManagerProps {
  adminUserId: string | null;
  readOnly?: boolean;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

// ── FENABRAVE – Ranking dos emplacamentos acumulados até Dezembro/2017 ──
const FENABRAVE_2017_RANKING_SEED: Omit<FleetRanking, 'id'>[] = [
  // AUTOMÓVEIS
  { year: 2017, vehicle_type: 'automovel', position: 1, model: 'GM/ONIX', quantity: 188654 },
  { year: 2017, vehicle_type: 'automovel', position: 2, model: 'HYUNDAI/HB20', quantity: 105539 },
  { year: 2017, vehicle_type: 'automovel', position: 3, model: 'FORD/KA', quantity: 94803 },
  { year: 2017, vehicle_type: 'automovel', position: 4, model: 'VW/GOL', quantity: 73919 },
  { year: 2017, vehicle_type: 'automovel', position: 5, model: 'GM/PRISMA', quantity: 68988 },
  { year: 2017, vehicle_type: 'automovel', position: 6, model: 'RENAULT/SANDERO', quantity: 67344 },
  { year: 2017, vehicle_type: 'automovel', position: 7, model: 'TOYOTA/COROLLA', quantity: 66188 },
  { year: 2017, vehicle_type: 'automovel', position: 8, model: 'FIAT/MOBI', quantity: 54270 },
  { year: 2017, vehicle_type: 'automovel', position: 9, model: 'JEEP/COMPASS', quantity: 49187 },
  { year: 2017, vehicle_type: 'automovel', position: 10, model: 'HONDA/HR-V', quantity: 47775 },
  { year: 2017, vehicle_type: 'automovel', position: 11, model: 'VW/FOX/CROSS FOX', quantity: 42716 },
  { year: 2017, vehicle_type: 'automovel', position: 12, model: 'TOYOTA/ETIOS HB', quantity: 41986 },
  { year: 2017, vehicle_type: 'automovel', position: 13, model: 'HYUNDAI/CRETA', quantity: 41625 },
  { year: 2017, vehicle_type: 'automovel', position: 14, model: 'VW/VOYAGE', quantity: 40822 },
  { year: 2017, vehicle_type: 'automovel', position: 15, model: 'JEEP/RENEGADE', quantity: 38330 },
  { year: 2017, vehicle_type: 'automovel', position: 16, model: 'FIAT/UNO', quantity: 34165 },
  { year: 2017, vehicle_type: 'automovel', position: 17, model: 'VW/UP', quantity: 34161 },
  { year: 2017, vehicle_type: 'automovel', position: 18, model: 'NISSAN/KICKS', quantity: 33464 },
  { year: 2017, vehicle_type: 'automovel', position: 19, model: 'HYUNDAI/HB20S', quantity: 32232 },
  { year: 2017, vehicle_type: 'automovel', position: 20, model: 'TOYOTA/ETIOS SEDAN', quantity: 31395 },
  { year: 2017, vehicle_type: 'automovel', position: 21, model: 'FORD/ECOSPORT', quantity: 31195 },
  { year: 2017, vehicle_type: 'automovel', position: 22, model: 'FIAT/ARGO', quantity: 27925 },
  { year: 2017, vehicle_type: 'automovel', position: 23, model: 'FORD/KA SEDAN', quantity: 27647 },
  { year: 2017, vehicle_type: 'automovel', position: 24, model: 'RENAULT/LOGAN', quantity: 26010 },
  { year: 2017, vehicle_type: 'automovel', position: 25, model: 'HONDA/CIVIC', quantity: 25871 },
  { year: 2017, vehicle_type: 'automovel', position: 26, model: 'HONDA/FIT', quantity: 25347 },
  { year: 2017, vehicle_type: 'automovel', position: 27, model: 'FIAT/SIENA', quantity: 24955 },
  { year: 2017, vehicle_type: 'automovel', position: 28, model: 'GM/SPIN', quantity: 24713 },
  { year: 2017, vehicle_type: 'automovel', position: 29, model: 'NISSAN/VERSA', quantity: 23370 },
  { year: 2017, vehicle_type: 'automovel', position: 30, model: 'GM/COBALT', quantity: 22949 },
  { year: 2017, vehicle_type: 'automovel', position: 31, model: 'RENAULT/KWID', quantity: 22576 },
  { year: 2017, vehicle_type: 'automovel', position: 32, model: 'FIAT/PALIO', quantity: 20138 },
  { year: 2017, vehicle_type: 'automovel', position: 33, model: 'GM/CRUZE SEDAN', quantity: 19192 },
  { year: 2017, vehicle_type: 'automovel', position: 34, model: 'FORD/FIESTA', quantity: 19057 },
  { year: 2017, vehicle_type: 'automovel', position: 35, model: 'RENAULT/DUSTER', quantity: 17638 },
  { year: 2017, vehicle_type: 'automovel', position: 36, model: 'HONDA/CITY', quantity: 15974 },
  { year: 2017, vehicle_type: 'automovel', position: 37, model: 'HONDA/WR-V', quantity: 15353 },
  { year: 2017, vehicle_type: 'automovel', position: 38, model: 'NISSAN/MARCH', quantity: 14052 },
  { year: 2017, vehicle_type: 'automovel', position: 39, model: 'RENAULT/CAPTUR', quantity: 13742 },
  { year: 2017, vehicle_type: 'automovel', position: 40, model: 'TOYOTA/HILUX SW4', quantity: 12567 },
  { year: 2017, vehicle_type: 'automovel', position: 41, model: 'PEUGEOT/208', quantity: 12157 },
  { year: 2017, vehicle_type: 'automovel', position: 42, model: 'GM/TRACKER', quantity: 12136 },
  { year: 2017, vehicle_type: 'automovel', position: 43, model: 'PEUGEOT/2008', quantity: 10571 },
  { year: 2017, vehicle_type: 'automovel', position: 44, model: 'HYUNDAI/IX35', quantity: 10254 },
  { year: 2017, vehicle_type: 'automovel', position: 45, model: 'CITROEN/C3', quantity: 9881 },
  { year: 2017, vehicle_type: 'automovel', position: 46, model: 'VW/POLO', quantity: 8685 },
  { year: 2017, vehicle_type: 'automovel', position: 47, model: 'CITROEN/AIRCROSS', quantity: 8314 },
  { year: 2017, vehicle_type: 'automovel', position: 48, model: 'VW/JETTA', quantity: 7669 },
  { year: 2017, vehicle_type: 'automovel', position: 49, model: 'GM/CRUZE HB', quantity: 7328 },
  { year: 2017, vehicle_type: 'automovel', position: 50, model: 'FORD/FOCUS SEDAN', quantity: 6163 },
  // COMERCIAIS LEVES
  { year: 2017, vehicle_type: 'comercial_leve', position: 1, model: 'FIAT/STRADA', quantity: 54870 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 2, model: 'FIAT/TORO', quantity: 50723 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 3, model: 'VW/SAVEIRO', quantity: 42414 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 4, model: 'TOYOTA/HILUX', quantity: 34368 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 5, model: 'GM/S10', quantity: 30438 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 6, model: 'FORD/RANGER', quantity: 17830 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 7, model: 'GM/MONTANA', quantity: 14872 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 8, model: 'VW/AMAROK', quantity: 11964 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 9, model: 'RENAULT/OROCH', quantity: 11047 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 10, model: 'FIAT/FIORINO', quantity: 10947 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 11, model: 'MITSUBISHI/L200', quantity: 9946 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 12, model: 'RENAULT/MASTER', quantity: 6181 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 13, model: 'NISSAN/FRONTIER', quantity: 4057 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 14, model: 'HYUNDAI/HR', quantity: 4041 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 15, model: 'IVECO/DAILY 3514', quantity: 2008 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 16, model: 'KIA/K2500', quantity: 1650 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 17, model: 'FIAT/DUCATO', quantity: 1544 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 18, model: 'RENAULT/KANGOO', quantity: 1254 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 19, model: 'PEUGEOT/PARTNER', quantity: 939 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 20, model: 'M.BENZ/SPRINTER 313', quantity: 620 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 21, model: 'FIAT/DOBLO', quantity: 606 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 22, model: 'M.BENZ/VITO', quantity: 438 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 23, model: 'M.BENZ/SPRINTER', quantity: 424 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 24, model: 'CITROEN/JUMPER', quantity: 415 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 25, model: 'TOYOTA/HILUX SW4', quantity: 391 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 26, model: 'LIFAN/FOISON', quantity: 380 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 27, model: 'RAM/2500', quantity: 332 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 28, model: 'M.BENZ/SPRINTER 311', quantity: 283 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 29, model: 'FIAT/UNO', quantity: 166 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 30, model: 'PEUGEOT/EXPERT', quantity: 154 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 31, model: 'CITROEN/JUMPY', quantity: 121 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 32, model: 'EFFA/K01', quantity: 107 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 33, model: 'PEUGEOT/BOXER', quantity: 87 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 34, model: 'IVECO/DAILY', quantity: 82 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 35, model: 'M.BENZ/SPRINTER 415', quantity: 67 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 36, model: 'FOTON/AUMARK 1039', quantity: 53 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 37, model: 'RENAULT/RENAULT', quantity: 46 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 38, model: 'EFFA/V21', quantity: 26 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 39, model: 'JAC/T8', quantity: 25 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 40, model: 'VICS/SAVEIRO', quantity: 24 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 41, model: 'RELY/RELY PICK-UP', quantity: 24 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 42, model: 'EFFA/K02', quantity: 23 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 43, model: 'FOTON/AUMARK 3.5-12DT', quantity: 23 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 44, model: 'M.BENZ/SPRINTER 515', quantity: 22 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 45, model: 'HAFEI/RUIYI', quantity: 22 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 46, model: 'TOYOTA/BANDEIRANTE', quantity: 21 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 47, model: 'SHINERAY/P TRUCKS', quantity: 18 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 48, model: 'HAFEI/TOWNER', quantity: 18 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 49, model: 'FOTON/AUMARK 3.5-14DT', quantity: 18 },
  { year: 2017, vehicle_type: 'comercial_leve', position: 50, model: 'EFFA/V22', quantity: 17 },
];

// ── FENABRAVE – Ranking dos emplacamentos acumulados até Dezembro/2018 ──
const FENABRAVE_2018_RANKING_SEED: Omit<FleetRanking, 'id'>[] = [
  // AUTOMÓVEIS
  { year: 2018, vehicle_type: 'automovel', position: 1, model: 'GM/ONIX', quantity: 210458 },
  { year: 2018, vehicle_type: 'automovel', position: 2, model: 'HYUNDAI/HB20', quantity: 105506 },
  { year: 2018, vehicle_type: 'automovel', position: 3, model: 'FORD/KA', quantity: 103286 },
  { year: 2018, vehicle_type: 'automovel', position: 4, model: 'VW/GOL', quantity: 77612 },
  { year: 2018, vehicle_type: 'automovel', position: 5, model: 'GM/PRISMA', quantity: 71735 },
  { year: 2018, vehicle_type: 'automovel', position: 6, model: 'VW/POLO', quantity: 69584 },
  { year: 2018, vehicle_type: 'automovel', position: 7, model: 'RENAULT/KWID', quantity: 67320 },
  { year: 2018, vehicle_type: 'automovel', position: 8, model: 'FIAT/ARGO', quantity: 63011 },
  { year: 2018, vehicle_type: 'automovel', position: 9, model: 'JEEP/COMPASS', quantity: 60284 },
  { year: 2018, vehicle_type: 'automovel', position: 10, model: 'TOYOTA/COROLLA', quantity: 59062 },
  { year: 2018, vehicle_type: 'automovel', position: 11, model: 'RENAULT/SANDERO', quantity: 52401 },
  { year: 2018, vehicle_type: 'automovel', position: 12, model: 'FIAT/MOBI', quantity: 49491 },
  { year: 2018, vehicle_type: 'automovel', position: 13, model: 'HYUNDAI/CRETA', quantity: 48876 },
  { year: 2018, vehicle_type: 'automovel', position: 14, model: 'HONDA/HR-V', quantity: 47959 },
  { year: 2018, vehicle_type: 'automovel', position: 15, model: 'NISSAN/KICKS', quantity: 46812 },
  { year: 2018, vehicle_type: 'automovel', position: 16, model: 'JEEP/RENEGADE', quantity: 46344 },
  { year: 2018, vehicle_type: 'automovel', position: 17, model: 'VW/VIRTUS', quantity: 41634 },
  { year: 2018, vehicle_type: 'automovel', position: 18, model: 'VW/FOX/CROSS FOX', quantity: 39260 },
  { year: 2018, vehicle_type: 'automovel', position: 19, model: 'FORD/KA SEDAN', quantity: 39027 },
  { year: 2018, vehicle_type: 'automovel', position: 20, model: 'FORD/ECOSPORT', quantity: 34497 },
  { year: 2018, vehicle_type: 'automovel', position: 21, model: 'VW/VOYAGE', quantity: 32683 },
  { year: 2018, vehicle_type: 'automovel', position: 22, model: 'HYUNDAI/HB20S', quantity: 32155 },
  { year: 2018, vehicle_type: 'automovel', position: 23, model: 'FIAT/CRONOS', quantity: 29307 },
  { year: 2018, vehicle_type: 'automovel', position: 24, model: 'NISSAN/VERSA', quantity: 27991 },
  { year: 2018, vehicle_type: 'automovel', position: 25, model: 'TOYOTA/ETIOS HB', quantity: 27847 },
  { year: 2018, vehicle_type: 'automovel', position: 26, model: 'HONDA/FIT', quantity: 27359 },
  { year: 2018, vehicle_type: 'automovel', position: 27, model: 'RENAULT/CAPTUR', quantity: 26504 },
  { year: 2018, vehicle_type: 'automovel', position: 28, model: 'GM/TRACKER', quantity: 26106 },
  { year: 2018, vehicle_type: 'automovel', position: 29, model: 'HONDA/CIVIC', quantity: 25942 },
  { year: 2018, vehicle_type: 'automovel', position: 30, model: 'GM/SPN', quantity: 25192 },
  { year: 2018, vehicle_type: 'automovel', position: 31, model: 'RENAULT/DUSTER', quantity: 23579 },
  { year: 2018, vehicle_type: 'automovel', position: 32, model: 'RENAULT/LOGAN', quantity: 22471 },
  { year: 2018, vehicle_type: 'automovel', position: 33, model: 'GM/COBALT', quantity: 21488 },
  { year: 2018, vehicle_type: 'automovel', position: 34, model: 'TOYOTA/ETIOS SEDAN', quantity: 21207 },
  { year: 2018, vehicle_type: 'automovel', position: 35, model: 'VW/UP', quantity: 20563 },
  { year: 2018, vehicle_type: 'automovel', position: 36, model: 'GM/CRUZE SEDAN', quantity: 19828 },
  { year: 2018, vehicle_type: 'automovel', position: 37, model: 'TOYOTA/YARIS HB', quantity: 18584 },
  { year: 2018, vehicle_type: 'automovel', position: 38, model: 'FIAT/SIENA', quantity: 17470 },
  { year: 2018, vehicle_type: 'automovel', position: 39, model: 'FIAT/UNO', quantity: 15151 },
  { year: 2018, vehicle_type: 'automovel', position: 40, model: 'HONDA/CITY', quantity: 14900 },
  { year: 2018, vehicle_type: 'automovel', position: 41, model: 'HONDA/WR-V', quantity: 14797 },
  { year: 2018, vehicle_type: 'automovel', position: 42, model: 'FORD/FIESTA', quantity: 14505 },
  { year: 2018, vehicle_type: 'automovel', position: 43, model: 'TOYOTA/YARIS SEDAN', quantity: 13674 },
  { year: 2018, vehicle_type: 'automovel', position: 44, model: 'TOYOTA/HILUX SW4', quantity: 13481 },
  { year: 2018, vehicle_type: 'automovel', position: 45, model: 'NISSAN/MARCH', quantity: 11047 },
  { year: 2018, vehicle_type: 'automovel', position: 46, model: 'PEUGEOT/2008', quantity: 9745 },
  { year: 2018, vehicle_type: 'automovel', position: 47, model: 'HYUNDAI/IX35', quantity: 8525 },
  { year: 2018, vehicle_type: 'automovel', position: 48, model: 'PEUGEOT/208', quantity: 7092 },
  { year: 2018, vehicle_type: 'automovel', position: 49, model: 'CITROEN/C3', quantity: 6378 },
  { year: 2018, vehicle_type: 'automovel', position: 50, model: 'VW/TIGUAN', quantity: 5771 },
  // COMERCIAIS LEVES
  { year: 2018, vehicle_type: 'comercial_leve', position: 1, model: 'FIAT/STRADA', quantity: 67227 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 2, model: 'FIAT/TORO', quantity: 58477 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 3, model: 'VW/SAVEIRO', quantity: 45920 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 4, model: 'TOYOTA/HILUX', quantity: 39278 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 5, model: 'GM/S10', quantity: 31761 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 6, model: 'FORD/RANGER', quantity: 20552 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 7, model: 'VW/AMAROK', quantity: 18766 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 8, model: 'FIAT/FIORINO', quantity: 13547 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 9, model: 'RENAULT/OROCH', quantity: 13409 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 10, model: 'GM/MONTANA', quantity: 13106 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 11, model: 'MITSUBISHI/L200', quantity: 10766 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 12, model: 'RENAULT/MASTER', quantity: 7193 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 13, model: 'NISSAN/FRONTIER', quantity: 6325 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 14, model: 'HYUNDAI/HR', quantity: 4310 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 15, model: 'FIAT/DUCATO', quantity: 3029 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 16, model: 'KIA/K2500', quantity: 2481 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 17, model: 'IVECO/DAILY 5514', quantity: 2068 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 18, model: 'M.BENZ/SPRINTER 313', quantity: 1321 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 19, model: 'VW/EXPRESS', quantity: 1312 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 20, model: 'PEUGEOT/PARTNER', quantity: 1268 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 21, model: 'RENAULT/KANGOO', quantity: 1265 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 22, model: 'CITROEN/JUMPY', quantity: 1171 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 23, model: 'PEUGEOT/EXPERT', quantity: 902 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 24, model: 'RAM/2500', quantity: 678 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 25, model: 'M.BENZ/SPRINTER', quantity: 633 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 26, model: 'IVECO/DAILY 30S13', quantity: 334 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 27, model: 'CITROEN/BERLINGO', quantity: 293 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 28, model: 'M.BENZ/SPRINTER 415', quantity: 181 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 29, model: 'IVECO/DAILY', quantity: 163 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 30, model: 'JAC/V260', quantity: 160 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 31, model: 'EFFA/K01', quantity: 136 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 32, model: 'FIAT/UNO', quantity: 88 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 33, model: 'IVECO/DAILY 5516', quantity: 78 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 34, model: 'LIFAN/FOISON', quantity: 77 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 35, model: 'M.BENZ/VITO', quantity: 50 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 36, model: 'EFFA/K02', quantity: 37 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 37, model: 'CITROEN/JUMPER', quantity: 35 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 38, model: 'EFFA/V21', quantity: 32 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 39, model: 'EFFA/V22', quantity: 27 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 40, model: 'TOYOTA/BANDEIRANTE', quantity: 24 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 41, model: 'FOTON/AUMARK 3.5-14DT', quantity: 23 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 42, model: 'M.BENZ/SPRINTER 311', quantity: 22 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 43, model: 'FORD/F150', quantity: 21 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 44, model: 'JAC/T8', quantity: 19 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 45, model: 'VW/KOMBI', quantity: 17 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 46, model: 'M.BENZ/SPRINTER 515', quantity: 15 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 47, model: 'RELY/RELY PICK-UP', quantity: 13 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 48, model: 'PEUGEOT/BOXER', quantity: 9 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 49, model: 'M.BENZ/REBAIXATO', quantity: 8 },
  { year: 2018, vehicle_type: 'comercial_leve', position: 50, model: 'AGRALE/AGRALE MARRUÁ', quantity: 7 },
];

// ── FENABRAVE – Ranking dos emplacamentos acumulados até Dezembro/2019 ──
const FENABRAVE_2019_RANKING_SEED: Omit<FleetRanking, 'id'>[] = [
  // AUTOMÓVEIS
  { year: 2019, vehicle_type: 'automovel', position: 1, model: 'GM/ONIX', quantity: 241214 },
  { year: 2019, vehicle_type: 'automovel', position: 2, model: 'FORD/KA', quantity: 104331 },
  { year: 2019, vehicle_type: 'automovel', position: 3, model: 'HYUNDAI/HB20', quantity: 101590 },
  { year: 2019, vehicle_type: 'automovel', position: 4, model: 'RENAULT/KWID', quantity: 85117 },
  { year: 2019, vehicle_type: 'automovel', position: 5, model: 'VW/GOL', quantity: 81285 },
  { year: 2019, vehicle_type: 'automovel', position: 6, model: 'FIAT/ARGO', quantity: 79000 },
  { year: 2019, vehicle_type: 'automovel', position: 7, model: 'GM/PRISMA', quantity: 73721 },
  { year: 2019, vehicle_type: 'automovel', position: 8, model: 'VW/POLO', quantity: 72057 },
  { year: 2019, vehicle_type: 'automovel', position: 9, model: 'JEEP/RENEGADE', quantity: 68726 },
  { year: 2019, vehicle_type: 'automovel', position: 10, model: 'JEEP/COMPASS', quantity: 60361 },
  { year: 2019, vehicle_type: 'automovel', position: 11, model: 'HYUNDAI/CRETA', quantity: 57460 },
  { year: 2019, vehicle_type: 'automovel', position: 12, model: 'TOYOTA/COROLLA', quantity: 56727 },
  { year: 2019, vehicle_type: 'automovel', position: 13, model: 'NISSAN/KICKS', quantity: 56060 },
  { year: 2019, vehicle_type: 'automovel', position: 14, model: 'FIAT/MOBI', quantity: 53444 },
  { year: 2019, vehicle_type: 'automovel', position: 15, model: 'FORD/KA SEDAN', quantity: 51260 },
  { year: 2019, vehicle_type: 'automovel', position: 16, model: 'RENAULT/SANDERO', quantity: 50303 },
  { year: 2019, vehicle_type: 'automovel', position: 17, model: 'HONDA/HR-V', quantity: 49488 },
  { year: 2019, vehicle_type: 'automovel', position: 18, model: 'VW/VIRTUS', quantity: 46876 },
  { year: 2019, vehicle_type: 'automovel', position: 19, model: 'VW/FOX/CROSS FOX', quantity: 38487 },
  { year: 2019, vehicle_type: 'automovel', position: 20, model: 'TOYOTA/YARIS HB', quantity: 37686 },
  { year: 2019, vehicle_type: 'automovel', position: 21, model: 'VW/T-CROSS', quantity: 37081 },
  { year: 2019, vehicle_type: 'automovel', position: 22, model: 'HYUNDAI/HB20S', quantity: 34893 },
  { year: 2019, vehicle_type: 'automovel', position: 23, model: 'FORD/ECOSPORT', quantity: 34205 },
  { year: 2019, vehicle_type: 'automovel', position: 24, model: 'VW/VOYAGE', quantity: 32055 },
  { year: 2019, vehicle_type: 'automovel', position: 25, model: 'TOYOTA/YARIS SEDAN', quantity: 29759 },
  { year: 2019, vehicle_type: 'automovel', position: 26, model: 'RENAULT/CAPTUR', quantity: 28660 },
  { year: 2019, vehicle_type: 'automovel', position: 27, model: 'GM/SPIN', quantity: 28361 },
  { year: 2019, vehicle_type: 'automovel', position: 28, model: 'HONDA/CIVIC', quantity: 27318 },
  { year: 2019, vehicle_type: 'automovel', position: 29, model: 'RENAULT/LOGAN', quantity: 27005 },
  { year: 2019, vehicle_type: 'automovel', position: 30, model: 'GM/ONIX PLUS', quantity: 26852 },
  { year: 2019, vehicle_type: 'automovel', position: 31, model: 'RENAULT/DUSTER', quantity: 26090 },
  { year: 2019, vehicle_type: 'automovel', position: 32, model: 'HONDA/FIT', quantity: 24457 },
  { year: 2019, vehicle_type: 'automovel', position: 33, model: 'FIAT/CRONOS', quantity: 24080 },
  { year: 2019, vehicle_type: 'automovel', position: 34, model: 'NISSAN/VERSA', quantity: 21779 },
  { year: 2019, vehicle_type: 'automovel', position: 35, model: 'FIAT/UNO', quantity: 19928 },
  { year: 2019, vehicle_type: 'automovel', position: 36, model: 'TOYOTA/ETIOS HB', quantity: 18963 },
  { year: 2019, vehicle_type: 'automovel', position: 37, model: 'GM/CRUZE SEDAN', quantity: 17829 },
  { year: 2019, vehicle_type: 'automovel', position: 38, model: 'CITROEN/C4 CACTUS', quantity: 16438 },
  { year: 2019, vehicle_type: 'automovel', position: 39, model: 'GM/TRACKER', quantity: 16333 },
  { year: 2019, vehicle_type: 'automovel', position: 40, model: 'FIAT/SIENA', quantity: 16188 },
  { year: 2019, vehicle_type: 'automovel', position: 41, model: 'HONDA/CITY', quantity: 14578 },
  { year: 2019, vehicle_type: 'automovel', position: 42, model: 'TOYOTA/HILUX SW4', quantity: 13523 },
  { year: 2019, vehicle_type: 'automovel', position: 43, model: 'VW/UP', quantity: 13460 },
  { year: 2019, vehicle_type: 'automovel', position: 44, model: 'TOYOTA/ETIOS SEDAN', quantity: 13305 },
  { year: 2019, vehicle_type: 'automovel', position: 45, model: 'GM/COBALT', quantity: 13105 },
  { year: 2019, vehicle_type: 'automovel', position: 46, model: 'VW/TIGUAN', quantity: 13074 },
  { year: 2019, vehicle_type: 'automovel', position: 47, model: 'HONDA/WR-V', quantity: 12168 },
  { year: 2019, vehicle_type: 'automovel', position: 48, model: 'VW/JETTA', quantity: 11248 },
  { year: 2019, vehicle_type: 'automovel', position: 49, model: 'PEUGEOT/2008', quantity: 8693 },
  { year: 2019, vehicle_type: 'automovel', position: 50, model: 'CHERY/TIGGO 5X', quantity: 7971 },
  // COMERCIAIS LEVES
  { year: 2019, vehicle_type: 'comercial_leve', position: 1, model: 'FIAT/STRADA', quantity: 76223 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 2, model: 'FIAT/TORO', quantity: 65566 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 3, model: 'VW/SAVEIRO', quantity: 42270 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 4, model: 'TOYOTA/HILUX', quantity: 40410 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 5, model: 'GM/S10', quantity: 32161 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 6, model: 'FORD/RANGER', quantity: 22218 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 7, model: 'VW/AMAROK', quantity: 18911 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 8, model: 'FIAT/FIORINO', quantity: 17342 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 9, model: 'RENAULT/OROCH', quantity: 13363 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 10, model: 'GM/MONTANA', quantity: 12524 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 11, model: 'MITSUBISHI/L200', quantity: 10226 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 12, model: 'RENAULT/MASTER', quantity: 8478 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 13, model: 'NISSAN/FRONTIER', quantity: 8089 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 14, model: 'FIAT/DUCATO', quantity: 5489 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 15, model: 'HYUNDAI/HR', quantity: 3996 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 16, model: 'VW/EXPRESS', quantity: 3497 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 17, model: 'KIA/K2500', quantity: 2430 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 18, model: 'PEUGEOT/EXPERT', quantity: 2306 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 19, model: 'CITROEN/JUMPY', quantity: 1984 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 20, model: 'IVECO/DAILY 35S14', quantity: 1825 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 21, model: 'PEUGEOT/PARTNER', quantity: 1798 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 22, model: 'M.BENZ/SPRINTER 313', quantity: 1571 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 23, model: 'IVECO/DAILY 30S13', quantity: 848 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 24, model: 'RAM/2500', quantity: 652 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 25, model: 'CITROEN/BERLINGO', quantity: 626 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 26, model: 'M.BENZ/SPRINTER', quantity: 297 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 27, model: 'PEUGEOT/BOXER', quantity: 222 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 28, model: 'JAC/V260', quantity: 196 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 29, model: 'IVECO/DAILY', quantity: 175 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 30, model: 'CITROEN/JUMPER', quantity: 169 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 31, model: 'M.BENZ/SPRINTER 415', quantity: 138 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 32, model: 'EFFA/V21', quantity: 128 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 33, model: 'FOTON/AUMARK 1039', quantity: 108 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 34, model: 'IVECO/DAILY 5516', quantity: 90 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 35, model: 'FIAT/UNO', quantity: 89 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 36, model: 'EFFA/K01', quantity: 70 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 37, model: 'M.BENZ/SPRINTER 416', quantity: 68 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 38, model: 'EFFA/V22', quantity: 66 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 39, model: 'RENAULT/KANGOO', quantity: 41 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 40, model: 'EFFA/K02', quantity: 27 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 41, model: 'TOYOTA/BANDEIRANTE', quantity: 22 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 42, model: 'VW/KOMBI', quantity: 20 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 43, model: 'M.BENZ/SPRINTER 515', quantity: 17 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 44, model: 'AGRALE/AGRALE MARRUÁ', quantity: 15 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 45, model: 'M.BENZ/SPRINTER 314', quantity: 15 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 46, model: 'FORD/F100', quantity: 13 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 47, model: 'FOTON/TUNLAND', quantity: 12 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 48, model: 'FORD/F75', quantity: 10 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 49, model: 'WILLYS/OVERLAND', quantity: 10 },
  { year: 2019, vehicle_type: 'comercial_leve', position: 50, model: 'GM/CHEVROLET', quantity: 6 },
];

// ── FENABRAVE – Ranking dos emplacamentos acumulados até Dezembro/2020 ──
const FENABRAVE_2020_RANKING_SEED: Omit<FleetRanking, 'id'>[] = [
  // AUTOMÓVEIS
  { year: 2020, vehicle_type: 'automovel', position: 1, model: 'GM/ONIX', quantity: 135351 },
  { year: 2020, vehicle_type: 'automovel', position: 2, model: 'HYUNDAI/HB20', quantity: 86548 },
  { year: 2020, vehicle_type: 'automovel', position: 3, model: 'GM/ONIX PLUS', quantity: 83392 },
  { year: 2020, vehicle_type: 'automovel', position: 4, model: 'VW/GOL', quantity: 71151 },
  { year: 2020, vehicle_type: 'automovel', position: 5, model: 'FORD/KA', quantity: 67491 },
  { year: 2020, vehicle_type: 'automovel', position: 6, model: 'FIAT/ARGO', quantity: 65937 },
  { year: 2020, vehicle_type: 'automovel', position: 7, model: 'VW/T-CROSS', quantity: 60119 },
  { year: 2020, vehicle_type: 'automovel', position: 8, model: 'JEEP/RENEGADE', quantity: 56865 },
  { year: 2020, vehicle_type: 'automovel', position: 9, model: 'JEEP/COMPASS', quantity: 52966 },
  { year: 2020, vehicle_type: 'automovel', position: 10, model: 'RENAULT/KWID', quantity: 49475 },
  { year: 2020, vehicle_type: 'automovel', position: 11, model: 'GM/TRACKER', quantity: 49372 },
  { year: 2020, vehicle_type: 'automovel', position: 12, model: 'HYUNDAI/CRETA', quantity: 47757 },
  { year: 2020, vehicle_type: 'automovel', position: 13, model: 'FIAT/MOBI', quantity: 46617 },
  { year: 2020, vehicle_type: 'automovel', position: 14, model: 'VW/POLO', quantity: 41836 },
  { year: 2020, vehicle_type: 'automovel', position: 15, model: 'TOYOTA/COROLLA', quantity: 41072 },
  { year: 2020, vehicle_type: 'automovel', position: 16, model: 'NISSAN/KICKS', quantity: 36433 },
  { year: 2020, vehicle_type: 'automovel', position: 17, model: 'HONDA/HR-V', quantity: 32531 },
  { year: 2020, vehicle_type: 'automovel', position: 18, model: 'VW/VIRTUS', quantity: 30880 },
  { year: 2020, vehicle_type: 'automovel', position: 19, model: 'RENAULT/SANDERO', quantity: 26344 },
  { year: 2020, vehicle_type: 'automovel', position: 20, model: 'FORD/KA SEDAN', quantity: 25743 },
  { year: 2020, vehicle_type: 'automovel', position: 21, model: 'VW/VOYAGE', quantity: 24114 },
  { year: 2020, vehicle_type: 'automovel', position: 22, model: 'FORD/ECOSPORT', quantity: 24031 },
  { year: 2020, vehicle_type: 'automovel', position: 23, model: 'HYUNDAI/HB20S', quantity: 23984 },
  { year: 2020, vehicle_type: 'automovel', position: 24, model: 'FIAT/UNO', quantity: 22737 },
  { year: 2020, vehicle_type: 'automovel', position: 25, model: 'TOYOTA/YARIS HB', quantity: 21451 },
  { year: 2020, vehicle_type: 'automovel', position: 26, model: 'HONDA/CIVIC', quantity: 20447 },
  { year: 2020, vehicle_type: 'automovel', position: 27, model: 'VW/FOX/CROSS FOX', quantity: 20382 },
  { year: 2020, vehicle_type: 'automovel', position: 28, model: 'RENAULT/DUSTER', quantity: 19476 },
  { year: 2020, vehicle_type: 'automovel', position: 29, model: 'VW/NIVUS', quantity: 16278 },
  { year: 2020, vehicle_type: 'automovel', position: 30, model: 'FIAT/CRONOS', quantity: 16165 },
  { year: 2020, vehicle_type: 'automovel', position: 31, model: 'TOYOTA/YARIS SEDAN', quantity: 16128 },
  { year: 2020, vehicle_type: 'automovel', position: 32, model: 'GM/SPIN', quantity: 15661 },
  { year: 2020, vehicle_type: 'automovel', position: 33, model: 'RENAULT/LOGAN', quantity: 12785 },
  { year: 2020, vehicle_type: 'automovel', position: 34, model: 'HONDA/FIT', quantity: 12833 },
  { year: 2020, vehicle_type: 'automovel', position: 35, model: 'RENAULT/CAPTUR', quantity: 10870 },
  { year: 2020, vehicle_type: 'automovel', position: 36, model: 'FIAT/SIENA', quantity: 10857 },
  { year: 2020, vehicle_type: 'automovel', position: 37, model: 'HONDA/WR-V', quantity: 10600 },
  { year: 2020, vehicle_type: 'automovel', position: 38, model: 'NISSAN/VERSA', quantity: 9906 },
  { year: 2020, vehicle_type: 'automovel', position: 39, model: 'CITROEN/C4 CACTUS', quantity: 9526 },
  { year: 2020, vehicle_type: 'automovel', position: 40, model: 'TOYOTA/HILUX SW4', quantity: 9128 },
  { year: 2020, vehicle_type: 'automovel', position: 41, model: 'GM/CRUZE SEDAN', quantity: 8802 },
  { year: 2020, vehicle_type: 'automovel', position: 42, model: 'CAOA CHERY/TIGGO 5X', quantity: 8768 },
  { year: 2020, vehicle_type: 'automovel', position: 43, model: 'TOYOTA/ETIOS HB', quantity: 8699 },
  { year: 2020, vehicle_type: 'automovel', position: 44, model: 'VW/TIGUAN', quantity: 8298 },
  { year: 2020, vehicle_type: 'automovel', position: 45, model: 'HONDA/CITY', quantity: 7280 },
  { year: 2020, vehicle_type: 'automovel', position: 46, model: 'VW/UP', quantity: 6924 },
  { year: 2020, vehicle_type: 'automovel', position: 47, model: 'VW/JETTA', quantity: 5706 },
  { year: 2020, vehicle_type: 'automovel', position: 48, model: 'TOYOTA/ETIOS SEDAN', quantity: 5308 },
  { year: 2020, vehicle_type: 'automovel', position: 49, model: 'GM/EQUINOX', quantity: 4812 },
  { year: 2020, vehicle_type: 'automovel', position: 50, model: 'BMW/320I', quantity: 4794 },
  // COMERCIAIS LEVES
  { year: 2020, vehicle_type: 'comercial_leve', position: 1, model: 'FIAT/STRADA', quantity: 80041 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 2, model: 'FIAT/TORO', quantity: 53974 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 3, model: 'TOYOTA/HILUX', quantity: 32394 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 4, model: 'VW/SAVEIRO', quantity: 30965 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 5, model: 'GM/S10', quantity: 26639 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 6, model: 'FORD/RANGER', quantity: 19833 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 7, model: 'FIAT/FIORINO', quantity: 17852 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 8, model: 'VW/AMAROK', quantity: 10617 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 9, model: 'MITSUBISHI/L200', quantity: 9480 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 10, model: 'NISSAN/FRONTIER', quantity: 8077 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 11, model: 'GM/MONTANA', quantity: 6654 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 12, model: 'RENAULT/OROCH', quantity: 6070 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 13, model: 'RENAULT/MASTER', quantity: 5500 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 14, model: 'HYUNDAI/HR', quantity: 4150 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 15, model: 'FIAT/DUCATO', quantity: 3723 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 16, model: 'VW/MAN/EXPRESS', quantity: 3381 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 17, model: 'KIA/K2500', quantity: 2460 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 18, model: 'PEUGEOT/EXPERT', quantity: 1950 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 19, model: 'CITROEN/JUMPY', quantity: 1579 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 20, model: 'RAM/2500', quantity: 1475 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 21, model: 'IVECO/DAILY 35-150', quantity: 1403 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 22, model: 'M.BENZ/SPRINTER 416', quantity: 1244 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 23, model: 'IVECO/DAILY 30S13', quantity: 1031 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 24, model: 'PEUGEOT/PARTNER', quantity: 876 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 25, model: 'M.BENZ/SPRINTER 314', quantity: 770 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 26, model: 'IVECO/DAILY 35S14', quantity: 659 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 27, model: 'PEUGEOT/BOXER', quantity: 373 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 28, model: 'EFFA/V21', quantity: 301 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 29, model: 'CITROEN/JUMPER', quantity: 273 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 30, model: 'M.BENZ/SPRINTER', quantity: 219 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 31, model: 'FIAT/UNO', quantity: 205 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 32, model: 'FIAT/DOBLO', quantity: 185 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 33, model: 'JAC/V260', quantity: 118 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 34, model: 'EFFA/V22', quantity: 114 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 35, model: 'IVECO/DAILY 30-130', quantity: 96 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 36, model: 'FOTON/AUMARK 1039', quantity: 92 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 37, model: 'IVECO/DAILY', quantity: 78 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 38, model: 'M.BENZ/SPRINTER 313', quantity: 77 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 39, model: 'RENAULT/KANGOO', quantity: 66 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 40, model: 'FOTON/AUMARK 3.5-14DT', quantity: 52 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 41, model: 'M.BENZ/SPRINTER 415', quantity: 27 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 42, model: 'CITROEN/BERLINGO', quantity: 20 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 43, model: 'BYD/T3', quantity: 19 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 44, model: 'EFFA/K01', quantity: 16 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 45, model: 'EFFA/V25', quantity: 16 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 46, model: 'M.BENZ/VITO', quantity: 15 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 47, model: 'M.BENZ/SPRINTER 515', quantity: 11 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 48, model: 'TOYOTA/BANDEIRANTE', quantity: 10 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 49, model: 'VW/KOMBI', quantity: 9 },
  { year: 2020, vehicle_type: 'comercial_leve', position: 50, model: 'IVECO/DAILY 5516', quantity: 6 },
];

export function FleetRankingsManager({ adminUserId, readOnly = false }: FleetRankingsManagerProps) {
  const [rankings, setRankings] = useState<FleetRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('automovel');
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [listMatches, setListMatches] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('potencial');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fleet_rankings')
      .select('*')
      .order('year', { ascending: false })
      .order('position', { ascending: true });
    if (error) { toast.error('Erro ao carregar rankings'); setLoading(false); return; }
    const dbRows = (data || []) as FleetRanking[];

    // Merge seed data for years not already in DB
    let rows = dbRows;
    const seedSets: { year: number; data: Omit<FleetRanking, 'id'>[] }[] = [
      { year: 2017, data: FENABRAVE_2017_RANKING_SEED },
      { year: 2018, data: FENABRAVE_2018_RANKING_SEED },
      { year: 2019, data: FENABRAVE_2019_RANKING_SEED },
    ];
    for (const { year, data: seedData } of seedSets) {
      if (!dbRows.some(r => r.year === year)) {
        const seedRows: FleetRanking[] = seedData.map((s, i) => ({
          ...s,
          id: `seed-${year}-${s.vehicle_type}-${i}`,
        }));
        rows = [...rows, ...seedRows];
      }
    }

    setRankings(rows);
    const uniqueYears = [...new Set(rows.map(r => r.year))].sort((a, b) => b - a);
    setYears(uniqueYears);
    if (!selectedYear && uniqueYears.length > 0) setSelectedYear(String(uniqueYears[0]));
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => { fetchRankings(); }, []);

  // Only load item matches when the "demanda" tab is active (lazy)
  useEffect(() => {
    if (activeTab !== 'demanda' || !rankings.length) return;

    const matchModels = async () => {
      const { items } = await loadFleetAnalysisItems(adminUserId);
      if (!items.length) {
        setListMatches({});
        return;
      }

      const itemTexts = items.map(item => normalizeFleetText(`${item.aplicacao} ${item.produto} ${item.searchText}`));
      const models = [...new Set(rankings.map(r => r.model))];
      const counts: Record<string, number> = {};

      for (const model of models.slice(0, 30)) {
        const { normalized, keywords } = getFleetModelKeywords(model);
        counts[model] = itemTexts.reduce((total, itemText) => {
          return total + (itemMatchesFleetModel(itemText, normalized, keywords) ? 1 : 0);
        }, 0);
      }

      setListMatches(counts);
    };

    matchModels();
  }, [activeTab, rankings, adminUserId]);

  const filteredRankings = useMemo(() => {
    let filtered = rankings;
    if (selectedYear) filtered = filtered.filter(r => r.year === Number(selectedYear));
    if (selectedType) filtered = filtered.filter(r => r.vehicle_type === selectedType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.model.toLowerCase().includes(q));
    }
    return filtered;
  }, [rankings, selectedYear, selectedType, searchQuery]);

  const top10 = useMemo(() => filteredRankings.slice(0, 10), [filteredRankings]);
  const totalEmplacamentos = useMemo(() => filteredRankings.reduce((s, r) => s + r.quantity, 0), [filteredRankings]);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV vazio'); setImporting(false); return; }

      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('posicao') || header.includes('modelo') || header.includes('position');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      // Prompt for year
      const yearInput = prompt('Qual o ANO deste ranking? (ex: 2009)');
      if (!yearInput || isNaN(Number(yearInput))) { toast.error('Ano inválido'); setImporting(false); return; }
      const year = Number(yearInput);

      // Prompt for type
      const typeInput = prompt('Tipo: 1 = Automóvel, 2 = Comercial Leve');
      const vehicleType = typeInput === '2' ? 'comercial_leve' : 'automovel';

      // Delete existing data for this year+type
      await supabase.from('fleet_rankings').delete().eq('year', year).eq('vehicle_type', vehicleType);

      const rows: { year: number; position: number; model: string; quantity: number; vehicle_type: string }[] = [];
      for (let i = 0; i < dataLines.length; i++) {
        const parts = dataLines[i].split(/[,;\t]/).map(s => s.trim().replace(/"/g, ''));
        if (parts.length < 3) continue;
        // Try: position, model, quantity
        const pos = parseInt(parts[0].replace(/[°ºª]/g, ''));
        const model = parts[1];
        const qty = parseInt(parts[2].replace(/\./g, '').replace(/,/g, ''));
        if (isNaN(pos) || !model || isNaN(qty)) continue;
        rows.push({ year, position: pos, model: model.toUpperCase(), quantity: qty, vehicle_type: vehicleType });
      }

      if (!rows.length) { toast.error('Nenhum dado válido encontrado. Formato: posição, modelo, quantidade'); setImporting(false); return; }

      const { error } = await supabase.from('fleet_rankings').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} registros importados para ${year} (${vehicleType === 'automovel' ? 'Automóveis' : 'Comerciais Leves'})`);
      fetchRankings();
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteYear = async (year: number) => {
    if (!confirm(`Excluir todos os dados de ${year}?`)) return;
    await supabase.from('fleet_rankings').delete().eq('year', year);
    toast.success(`Dados de ${year} excluídos`);
    fetchRankings();
  };

  const handleDownloadTemplate = () => {
    const bom = '\uFEFF';
    const csv = bom + 'posicao;modelo;quantidade\n1;VW/GOL;303014\n2;FIAT/UNO;250000\n3;GM/CELTA;180000\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_ranking_frota.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Modelo CSV baixado!');
  };

  const handleExportData = () => {
    if (!filteredRankings.length) { toast.error('Nenhum dado para exportar'); return; }
    const bom = '\uFEFF';
    const header = 'posicao;modelo;quantidade;tipo;ano\n';
    const rows = filteredRankings.map(r => `${r.position};${r.model};${r.quantity};${r.vehicle_type};${r.year}`).join('\n');
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranking_frota_${selectedYear || 'todos'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados!');
  };

  const demandSuggestions = useMemo(() => {
    return top10.map(r => {
      const partsCount = listMatches[r.model] || 0;
      const sharePercent = totalEmplacamentos > 0 ? ((r.quantity / totalEmplacamentos) * 100).toFixed(1) : '0';
      let priority: 'alta' | 'media' | 'baixa' = 'baixa';
      if (r.position <= 5) priority = 'alta';
      else if (r.position <= 15) priority = 'media';
      return { ...r, partsCount, sharePercent, priority };
    });
  }, [top10, listMatches, totalEmplacamentos]);


  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Ranking Frota / Emplacamentos
          </h2>
          <p className="text-sm text-muted-foreground">Análise de frota circulante para previsão de demanda de peças</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportData}>
          <Download className="w-4 h-4 mr-1" /> Exportar Dados
        </Button>
      </div>

{!readOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 font-semibold text-primary hover:bg-primary/10">
                <Settings className="w-4 h-4" />
                ⚙️ Gerenciar Dados (Admin)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 space-y-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Formato CSV:</strong> posição, modelo, quantidade (ex: <code>1,VW/GOL,303014</code>). 
                  Separe automóveis e comerciais leves em importações distintas. Ao importar, informe o ano e o tipo do ranking.
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
                  {selectedYear && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteYear(Number(selectedYear))}>
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir {selectedYear}
                    </Button>
                  )}
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
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="automovel">Automóveis</SelectItem>
            <SelectItem value="comercial_leve">Comerciais Leves</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar modelo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
        </div>
        <div className="relative flex-1 min-w-[150px]">
          <Package className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto/código..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      {filteredRankings.length === 0 ? (
        <Card className="p-8 text-center">
          <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum ranking importado ainda. Importe um CSV com dados FENABRAVE.</p>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="potencial">🎯 Potencial</TabsTrigger>
            <TabsTrigger value="demanda">📊 Demanda</TabsTrigger>
            <TabsTrigger value="regional">🗺️ Regional</TabsTrigger>
            <TabsTrigger value="manutencao">🔧 Ciclo Manutenção</TabsTrigger>
            <TabsTrigger value="tendencia">📈 Tendência Multi-Ano</TabsTrigger>
            <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
            <TabsTrigger value="grafico">📉 Gráfico</TabsTrigger>
          </TabsList>

          <TabsContent value="potencial">
            <MarketPotentialTab
              rankings={rankings}
              selectedYear={selectedYear}
              selectedType={selectedType}
              externalProductSearch={productSearch}
              adminUserId={adminUserId}
            />
          </TabsContent>

          <TabsContent value="demanda" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Expectativa de Alta Demanda — Top 10 ({selectedYear})
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Veículos com maior frota circulante geram maior demanda por peças de reposição. 
                Priorize estoque para os modelos mais emplacados.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Emplacamentos</TableHead>
                    <TableHead className="text-right">% Mercado</TableHead>
                      <TableHead className="text-right">Peças na Lista</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandSuggestions.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.position}°</TableCell>
                      <TableCell className="font-medium">{r.model}</TableCell>
                      <TableCell className="text-right font-mono">{r.quantity.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono">{r.sharePercent}%</TableCell>
                      <TableCell className="text-right">
                        {r.partsCount > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <Package className="w-3 h-3" /> {r.partsCount}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-destructive">
                            <AlertTriangle className="w-3 h-3" /> 0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.priority === 'alta' ? 'default' : r.priority === 'media' ? 'secondary' : 'outline'}
                          className={r.priority === 'alta' ? 'bg-red-500 text-white' : ''}>
                          {r.priority === 'alta' ? '🔴 Alta' : r.priority === 'media' ? '🟡 Média' : '🟢 Baixa'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Total Emplacamentos</p>
                <p className="text-2xl font-bold">{totalEmplacamentos.toLocaleString('pt-BR')}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Modelos no Ranking</p>
                <p className="text-2xl font-bold">{filteredRankings.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Top 10 = % do Mercado</p>
                <p className="text-2xl font-bold">
                  {totalEmplacamentos > 0
                    ? ((top10.reduce((s, r) => s + r.quantity, 0) / totalEmplacamentos) * 100).toFixed(1)
                    : 0}%
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="regional">
            <RegionalAnalysisTab readOnly={readOnly} />
          </TabsContent>

          <TabsContent value="manutencao">
            <MaintenanceCycleTab top10={top10} selectedYear={selectedYear} />
          </TabsContent>

          <TabsContent value="tendencia">
            <MultiYearTrendTab rankings={rankings} selectedType={selectedType} />
          </TabsContent>

          <TabsContent value="ranking">
            <Card className="p-4 max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Emplacamentos</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRankings.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.position}°</TableCell>
                      <TableCell className="font-medium">{r.model}</TableCell>
                      <TableCell className="text-right font-mono">{r.quantity.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.vehicle_type === 'automovel' ? '🚗' : '🚐'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="grafico">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Top 10 — Emplacamentos ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={top10} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                  <YAxis type="category" dataKey="model" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                    {top10.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Part } from '@/hooks/usePartsDatabase';

export interface Suggestion {
  type: 'fornecedor' | 'produto' | 'veiculo';
  value: string;
  count: number;
}

// Normalize text for comparison
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Extract vehicle names from application field
function extractVehicles(aplicacao: string): string[] {
  const vehicles: string[] = [];
  
  // Common vehicle patterns
  const vehiclePatterns = [
    /\b(GOL|GOLF|POLO|FOX|VOYAGE|SAVEIRO|PARATI|SANTANA)\b/gi,
    /\b(CORSA|CELTA|PRISMA|ONIX|COBALT|SPIN|CRUZE|ASTRA|VECTRA|MERIVA)\b/gi,
    /\b(UNO|PALIO|SIENA|STRADA|PUNTO|LINEA|FIAT 500|MOBI|ARGO|CRONOS|TORO)\b/gi,
    /\b(CIVIC|FIT|CITY|HRV|CRV|ACCORD)\b/gi,
    /\b(COROLLA|ETIOS|YARIS|HILUX|RAV4|CAMRY)\b/gi,
    /\b(FIESTA|KA|FOCUS|ECOSPORT|RANGER|FUSION)\b/gi,
    /\b(HB20|CRETA|TUCSON|I30|ELANTRA|SANTA FE)\b/gi,
    /\b(DUSTER|SANDERO|LOGAN|KWID|CAPTUR|OROCH)\b/gi,
    /\b(KICKS|VERSA|MARCH|SENTRA|FRONTIER)\b/gi,
    /\b(COMPASS|RENEGADE|COMMANDER)\b/gi,
    /\b(T-CROSS|NIVUS|TAOS|TIGUAN|AMAROK)\b/gi,
  ];
  
  for (const pattern of vehiclePatterns) {
    const matches = aplicacao.match(pattern);
    if (matches) {
      vehicles.push(...matches.map(m => m.toUpperCase()));
    }
  }
  
  return [...new Set(vehicles)];
}

// Extract product types from description
function extractProductTypes(produto: string): string[] {
  const products: string[] = [];
  
  const productKeywords = [
    'ROLAMENTO', 'AMORTECEDOR', 'PASTILHA', 'DISCO', 'PIVO', 'BANDEJA',
    'BIELETA', 'TERMINAL', 'COXIM', 'BUCHA', 'JUNTA', 'BOMBA', 'TENSOR',
    'CORREIA', 'VELA', 'CABO', 'FILTRO', 'EMBREAGEM', 'VOLANTE', 'MANCAL',
    'BIELA', 'BRONZINA', 'PISTAO', 'ANEL', 'VALVULA', 'TUCHOS', 'RETENTOR',
    'SENSOR', 'MODULO', 'BOBINA', 'BICO', 'CAIXA', 'HOMOCINÉTICA', 'SEMI-EIXO',
    'CRUZETA', 'CARDAN', 'DIFERENCIAL', 'CUBO', 'MOLA', 'BATENTE', 'COIFA'
  ];
  
  const normalizedProduto = produto.toUpperCase();
  
  for (const keyword of productKeywords) {
    if (normalizedProduto.includes(keyword)) {
      products.push(keyword);
    }
  }
  
  return products;
}

export function useSearchSuggestions(parts: Part[], query: string) {
  const suggestions = useMemo(() => {
    // Mínimo 1 caractere para começar a sugerir
    if (!query.trim() || query.length < 1) return [];
    
    const normalizedQuery = normalize(query);
    const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length >= 1);
    
    if (queryTerms.length === 0) return [];
    
    // Count occurrences
    const fornecedorCounts = new Map<string, number>();
    const produtoCounts = new Map<string, number>();
    const veiculoCounts = new Map<string, number>();
    
    // Limite de peças a analisar para performance
    const partsToAnalyze = parts.slice(0, 10000);
    
    for (const part of partsToAnalyze) {
      const normalizedFornecedor = normalize(part.fornecedor);
      const normalizedProduto = normalize(part.produto);
      const normalizedAplicacao = normalize(part.aplicacao);
      const normalizedFabricante = normalize(part.fabricante); // código da peça
      
      // Check if any query term matches (incluindo código da peça)
      const matchesQuery = queryTerms.some(term => 
        normalizedFornecedor.includes(term) ||
        normalizedProduto.includes(term) ||
        normalizedAplicacao.includes(term) ||
        normalizedFabricante.includes(term)
      );
      
      if (!matchesQuery) continue;
      
      // Count fornecedor
      const fornecedor = part.fornecedor.trim().toUpperCase();
      if (fornecedor && fornecedor.length > 1) {
        fornecedorCounts.set(fornecedor, (fornecedorCounts.get(fornecedor) || 0) + 1);
      }
      
      // Extract and count product types
      const productTypes = extractProductTypes(part.produto);
      for (const pt of productTypes) {
        produtoCounts.set(pt, (produtoCounts.get(pt) || 0) + 1);
      }
      
      // Extract and count vehicles
      const vehicles = extractVehicles(part.aplicacao);
      for (const v of vehicles) {
        veiculoCounts.set(v, (veiculoCounts.get(v) || 0) + 1);
      }
    }
    
    // Build suggestions array
    const results: Suggestion[] = [];
    
    // Add top fornecedores (max 3)
    const topFornecedores = [...fornecedorCounts.entries()]
      .filter(([name]) => !queryTerms.some(t => normalize(name).includes(t)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    for (const [value, count] of topFornecedores) {
      results.push({ type: 'fornecedor', value, count });
    }
    
    // Add top produtos (max 3)
    const topProdutos = [...produtoCounts.entries()]
      .filter(([name]) => !queryTerms.some(t => normalize(name).includes(t)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    for (const [value, count] of topProdutos) {
      results.push({ type: 'produto', value, count });
    }
    
    // Add top veiculos (max 3)
    const topVeiculos = [...veiculoCounts.entries()]
      .filter(([name]) => !queryTerms.some(t => normalize(name).includes(t)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    for (const [value, count] of topVeiculos) {
      results.push({ type: 'veiculo', value, count });
    }
    
    return results.slice(0, 6); // Max 6 suggestions total
  }, [parts, query]);
  
  return suggestions;
}

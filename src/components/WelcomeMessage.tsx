import { useState, useMemo } from 'react';
import { Car, Bot, BookOpen, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Part } from '@/hooks/usePartsDatabase';
import { SupplierChatDialog } from './SupplierChatDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WelcomeMessageProps {
  onExampleClick: (query: string) => void;
  parts: Part[];
  onAddToQuote?: (part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => void;
  quoteItems?: string[];
}

export function WelcomeMessage({ onExampleClick, parts, onAddToQuote, quoteItems = [] }: WelcomeMessageProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [loadingSupplier, setLoadingSupplier] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique suppliers and count parts per supplier
  const suppliers = useMemo(() => {
    const supplierMap = new Map<string, number>();
    
    parts.forEach(part => {
      const supplier = part.fornecedor.trim().toUpperCase();
      if (supplier) {
        supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + 1);
      }
    });

    return Array.from(supplierMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parts]);

  // Supplier portfolios
  const supplierPortfolios: Record<string, string> = {
    'A J E': 'Adaptador de atuador, alavanca/trambulador, bobina de distribuidor, bocal de enchimento de óleo, carcaça de válvula termostática, embreagem de distribuidor, flanges, kit de válvula termostática, kit vedação de válvula termostática, módulo de ignição, tampa de óleo, tampa de válvula, tubo d\'água, válvula anti-chama e válvula aquecedora.',
    'APLIC': 'Balancim de motor, comando de válvula, corrente de motor, engrenagem de comando, engrenagem de virabrequim, escora de válvula, guia de válvula, guia tensora, kit comando de válvula, kit de distribuição c/ corrente, pinhão de distribuidor, polia de correia poly-v, suporte de comando de válvula, tensor de correia dentada e de corrente de motor, tucho de motor, válvula de alívio e vareta.',
    'ATE FREIOS': 'Cilindro de roda, cilindro mestre de freio, disco de freio, óleo de freio, pinça de freio, reparo de freio, servo de freio, válvula de frenagem.',
    'AXIOS': 'Axial de direção, bandeja de suspensão, batente de suspensão, bieleta de suspensão, bucha de direção, bucha de suspensão, coxim: amortecedor, câmbio, direção, motor, radiador e suspensão, espaçador de pinhão, kit coifa de homocinética, kit de amortecedor e suporte de barra tensora.',
    'BOSCH': 'Bico injetor, bobina de ignição, bomba d\'água auxiliar, bomba de alta pressão, bomba de combustível elétrica, cabo de ignição, carvão/escova, cilindro de roda, cilindro mestre de freio, condensador de distribuidor, corpo de borboleta, eletroventilador de radiador, flange de módulo de combustível, motor de limpador de parabrisa, motor de passo, óleo de freio, palheta de limpador, pastilha de freio, platinado, regulador de pressão e voltagem, reparo de bico injetor, rotor de distribuidor, sensor de ABS, detonação, nível, pressão MAP, rotação, servo de freio, sonda lambda, tampa de distribuidor, vela de ignição.',
    'BROSOL': 'Agulha de carburador, base e boia de carburador, bomba de combustível (elétrica e mecânica), bomba de óleo, carburador e kit de carburador.',
    'COBREQ': 'Pastilha de freio (normal, cerâmica e premium), sapata de freio.',
    'COFAP': 'Amortecedor de direção e de suspensão, amortecedor mola a gás, amortecedor tampa da caçamba, batente de suspensão, bieleta de suspensão, coxim de amortecedor, coxim de câmbio, cubo de roda, junta homocinética (lado câmbio e lado roda), kit coifa de homocinética, kit de amortecedor, mancal de cubo de roda, semi-eixo homocinético, trizeta, tulipa de câmbio, braço tensor.',
    'COFAP / BANDEJAS': 'Bandeja e suporte de barra tensora (morceguinho).',
    'CONTROIL FREIOS': 'Componentes para freios: cilindro mestre, cilindro de roda, servo freio, reparos de pinça.',
    'CONTITECH': 'Correia dentada, correia poly-v e correia V.',
    'DAYCO': 'Correia dentada, correia poly-v, correia V, kit de distribuição c/ correia, mangueira de arrefecimento, polia de correia dentada, polia de correia poly-v, polia roda livre, tensor de correia dentada e de correia poly-v.',
    'DELPHI': 'Ignição: bobina plástica, cabos de velas, tampa do distribuidor e rotor. Injeção eletrônica: motor de passo, sonda lambda, kit bomba combustível, bomba combustível (refil), bico injetor, sensor posição borboleta, corpo de borboleta e sensor pressão absoluta (MAP). Térmico: aditivos para radiador. Diesel: vela aquecedora.',
    'DYNA': 'Palheta de limpador.',
    'FAG': 'Rolamentos.',
    'FRAS-LE': 'Lona de freio, pastilha de freio, sapata de freio.',
    'FREMAX': 'Cubo de roda, disco de freio, mancal de cubo de roda, tambor de freio.',
    'GONEL': 'Kit guarnição/vedação, mangueira de filtro de ar, reservatórios de compensação, expansão, gasolina partida a frio e lavador de parabrisa, suporte reservatório, tampa de reservatório de parabrisa.',
    'HIPPER FREIOS': 'Cilindro de roda, cilindro mestre de freio, cubo de roda, disco de freio, mancal de cubo de roda, ponta de eixo, tambor de freio, trizeta, tulipa de câmbio.',
    'IMA': 'Cubo de roda, embuchamento de suspensão, garfo de embreagem, junta homocinética lado câmbio e lado roda, kit rolamento de roda, mancal de cubo de roda, pino de embuchamento, ponta de eixo, rolamento de roda, rolamento de semi-eixo, semi-eixo homocinético, trizeta e tulipa de câmbio.',
    'INA': 'Tensionadores e polias, kit de distribuição, balancim, tuchos de válvulas e bomba d\'água. Rolamentos para: semi-eixo, câmbio e coluna amortecedor e roda.',
    'INDISA': 'Bomba d\'água, bomba auxiliar, bomba de combustível mecânica, bomba de direção hidráulica, bomba de óleo, caixa de direção elétrica, caixa de direção hidráulica, carcaça de bomba d\'água, flange de bomba d\'água, kit de distribuição c/ correia, kit de distribuição c/ corrente e tucho de motor.',
    'LUK': 'Atuador de embreagem, cilindro auxiliar de embreagem, cilindro mestre de embreagem, disco de embreagem, kit cilindro de embreagem, kit de embreagem, kit de embreagem remanu, platô de embreagem, rolamento de câmbio, rolamento de embreagem, volante de motor.',
    'MAGNETI MARELLI': 'Acumulador de óleo, agulha de carburador, bico injetor, bico injetor diesel (ponteira), bobina de ignição asfáltica, bobina de ignição plástica, boia de carburador, bomba d\'água, bomba de combustível elétrica, bomba de combustível mecânica, bomba de óleo, bomba de óleo de câmbio, cabo de ignição, corpo de borboleta, diafragma de carburador, diafragma de injeção, eixo de câmbio, eletroválvula, eletroventilador de evaporador, eletroventilador de radiador, eletroventilador embreagem viscosa, farol, filtro de ar de motor, filtro de bomba de combustível, filtro de combustível, filtro de óleo, induzido de motor de partida, interruptor de óleo de câmbio, kit de carburador, kit de distribuição c/ correia, kit guarnição/vedação, módulo de injeção, motor de passo, motor elétrico, pinhão de semi-eixo, radiador, regulador de pressão, reservatório de câmbio, sensor de câmbio, sensor de posição de borboleta, sensor de pressão de coletor - MAP, sensor de temperatura, sonda lambda, válvula termostática, vela aquecedora.',
    'METAL LEVE': 'Motor: pistões com anéis (P&A), anéis, kits de motor, super kits, válvulas escape e admissão, bronzinas, tuchos e guias de válvula e válvula termostática. Filtros em geral: ar, cabine, combustível, lubrificante, sedimentador e hidráulico, compressores de ar condicionado.',
    'MTE - THOMSON': 'Bobina de ignição plástica, corpo de borboleta, kit de válvula termostática, módulo de ignição, motor de passo, sensor de detonação, sensor de fase, sensor de fluxo de massa de ar - MAF, sensor de posição de borboleta, sensor de pressão de coletor - MAP, sensor de rotação, sensor de temperatura, sensor de temperatura dos gases de escapamento - EGTS, sensor de velocidade, sonda lambda, válvula termostática.',
    'NAKATA': 'Assento prato de mola, axial de direção, bandeja de suspensão, barra de direção, barra estabilizadora, bieleta de suspensão, bomba d\'água, bomba de óleo, braço de direção, braço de suspensão, bucha de direção, bucha de suspensão, caixa de direção elétrica, caixa de direção hidráulica, caixa de direção mecânica, coroa e pinhão, coxim de amortecedor, coxim de câmbio, coxim de motor, cruzeta de cardan, cubo de roda, disco de freio, junta homocinética (câmbio e roda), kit coifa de homocinética, kit de amortecedor, mancal de cubo de roda, pastilha de freio, pivô de suspensão, sapata de freio, suporte de barra tensora, terminal de câmbio, terminal de direção, tirante de suspensão.',
    'NGK': 'Bobina de ignição plástica, cabo de ignição, sensores: ABS, nível, posição de borboleta, pressão de coletor MAP, rotação, temperatura e velocidade, sonda lambda, terminal de bobina, vela aquecedora e vela de ignição.',
    'NYTRON': 'Tensionadores, polias, kits de distribuição.',
    'PHILIPS': 'Lâmpadas em geral para: faróis, lanternas, luz de placa, teto e led.',
    'SABO': 'Juntas, retentores, rolamentos de cardan, kit parafuso de cabeçote, kit reparo junta homocinética, coxim motor, kit reparo amortecedor e buchas de suspensão.',
    'SACHS': 'Kit de embreagem.',
    'SAMPEL': 'Assento prato de mola, batente de suspensão, bieleta de suspensão, bucha de suspensão, coifa de caixa de direção, coxim de amortecedor, coxim de câmbio, coxim de escapamento, coxim de motor, coxim de radiador, junta de coletor, kit coifa de homocinética, kit de amortecedor, kit estabilizador, suporte de barra tensora, tirante de câmbio.',
    'SCHADEK': 'Bomba d\'água, bomba de óleo, peneira de pescador, pescador de bomba de óleo, válvula de alívio.',
    'SKF': 'Rolamentos: roda, diferencial, embreagem, alternador, kit rolamentos roda, cubos de roda c/rolamento, tensionadores e polias. Embreagens: cilindro mestre, escravo e atuador hidráulico. Suspensão: pivô, terminal, articulação axial, bieletas, braço oscilantes, bandejas, junta homocinética, cruzetas. Motor: bomba d\'água, bombas de óleo.',
    'SYL': 'Lona de freio, pastilha de freio, pastilha de freio cerâmica, sapata de freio.',
    'TANCLICK': 'Capa de tucho, filtro de combustível, reservatório de expansão, tampa de combustível, tampa de óleo, tampa de partida a frio, tampa de radiador, tampa de reservatório de expansão, tampa de reservatório de parabrisa, tubo de combustível.',
    'TECFIL': 'Filtro de ar condicionado (com e sem carvão), filtro de ar de motor, filtro de câmbio automático, filtro de combustível, filtro de óleo, filtro de óleo hidráulico, filtro separador de água.',
    'THERMAL (WAHLER)': 'Carcaça de válvula termostática, sensor de temperatura, válvula termostática.',
    'TRW': 'Mecanismo de direção hidráulico, mecânica e elétrica, bomba direção hidráulica, articulação axial, pivôs, terminais, barras, braço pitman e auxiliar e bieletas.',
    'URBA': 'Bomba d\'água, reparo de bomba d\'água, selo de bomba d\'água.',
    'VALCLEI': 'Válvulas termostáticas, kit válvulas termostáticas (válvula + carcaça), interruptores térmicos, sensores de temperatura, plugue eletrônico, tubos de refrigeração (metal e plástico), flanges de plástico, flanges válvula termostática, cotovelos da válvula termostática, conexão rápida, carcaça válvula termostática e antichama, radiador trocador de calor e interruptor de óleo.',
    'VALEO': 'Aditivo de radiador, atuador de embreagem, cilindro auxiliar de embreagem, cilindro mestre de embreagem, cilindro mestre de freio, condensador de ar condicionado, eletroventilador de radiador, farol, kit cilindro de embreagem, kit de embreagem, motor de partida, palheta de limpador, radiador, reservatório de expansão.',
    'VARGA': 'Componentes para freios: cilindro mestre, cilindro de roda, disco, tambor, pastilha, flexíveis e fluidos de freios.',
    'WEGA': 'Copo acrílico, filtro de ar condicionado (com e sem carvão), filtro de ar de motor, filtro de câmbio automático, filtro de combustível, filtro de óleo, filtro kit reparação, flange de filtro de óleo.',
  };

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    return suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const handleOpenCatalog = (supplierName: string) => {
    setLoadingSupplier(supplierName);
    setTimeout(() => {
      setSelectedSupplier(supplierName);
      setLoadingSupplier(null);
    }, 500);
  };

  return (
    <>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-amber-600 mb-6 animate-pulse-glow">
              <Car className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">
              Olá! Sou o <span className="text-gradient">ConsultaParts AI</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Seu assistente inteligente para consulta de peças automotivas.
              <br />
              Pergunte sobre qualquer peça, veículo ou código!
            </p>
          </div>

          {/* Catalogs Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Catálogos por Fornecedor</h3>
              <span className="text-sm text-muted-foreground">
                ({filteredSuppliers.length} fornecedores)
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>

            {/* Suppliers Grid */}
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pr-4">
                {filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.name}
                    className="flex flex-col p-3 rounded-lg bg-card border hover:border-primary/50 transition-colors group"
                  >
                    {/* Header com ícone/robô */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 group-hover:bg-primary/20">
                        {loadingSupplier === supplier.name ? (
                          <Bot className="w-5 h-5 text-primary animate-bounce" />
                        ) : (
                          supplier.name.substring(0, 2)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.count.toLocaleString()} peças
                        </p>
                        {supplierPortfolios[supplier.name] && (
                          <p className="text-[10px] text-muted-foreground/70 leading-tight mt-1 line-clamp-2" title={supplierPortfolios[supplier.name]}>
                            {supplierPortfolios[supplier.name]}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Botão de ação */}
                    <div className="mt-auto">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenCatalog(supplier.name)}
                        disabled={loadingSupplier === supplier.name}
                        className="h-7 text-xs gap-1.5 w-full justify-center"
                      >
                        {loadingSupplier === supplier.name ? (
                          <>
                            <Bot className="w-3.5 h-3.5 animate-bounce" />
                            Consultando...
                          </>
                        ) : (
                          <>
                            <Bot className="w-3.5 h-3.5" />
                            Consultar IA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredSuppliers.length === 0 && suppliers.length > 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Nenhum fornecedor encontrado para "{searchTerm}"
                  </div>
                )}

                {suppliers.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Carregando catálogos...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Base de dados com mais de 13.000 peças automotivas
          </p>
        </div>
      </div>

      <SupplierChatDialog
        open={!!selectedSupplier}
        onOpenChange={(open) => !open && setSelectedSupplier(null)}
        supplierName={selectedSupplier || ''}
        parts={parts}
        onAddToQuote={onAddToQuote}
        quoteItems={quoteItems}
      />
    </>
  );
}

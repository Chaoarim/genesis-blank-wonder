import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, BarChart3, PlusCircle, Package, Users, Tag, Target, Receipt } from 'lucide-react';

export function HelpGuide() {
  return (
    <div className="flex-1 overflow-auto bg-muted/10 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Como Usar o Sistema</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Aqui você encontra explicações claras e diretas sobre cada funcionalidade do sistema.
        </p>

        <Card className="p-6">
          <ScrollArea className="h-[70vh] pr-4">
            <Accordion type="single" collapsible className="w-full space-y-4">
              
              <AccordionItem value="item-1" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Principal (Dashboard e Pedidos)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground space-y-3 pt-2">
                  <p><strong>Dashboard:</strong> Acompanhe o resumo das suas vendas diárias e mensais, veja seu ticket médio e acesse as vendas mais recentes.</p>
                  <p><strong>Nova Venda (PDV):</strong> Use esta tela para criar um novo pedido. Adicione o cliente, busque os produtos diretamente do seu estoque, defina o tipo de entrega e a forma de pagamento (Dinheiro, PIX, Cartão ou Faturado).</p>
                  <p><strong>Pedidos (Catálogo B2B):</strong> Todos os pedidos feitos pelos seus clientes através do seu link exclusivo de catálogo caem aqui. Você pode aprovar e iniciar o atendimento direto no WhatsApp.</p>
                  <p><strong>Histórico:</strong> Consulte todas as vendas finalizadas, reimprima recibos ou cancele vendas se necessário (itens voltarão para o estoque).</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Gestão de Clientes</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground space-y-3 pt-2">
                  <p><strong>Clientes:</strong> Cadastre novos clientes (oficinas ou consumidores finais) com CPF/CNPJ. Clientes cadastrados via Catálogo B2B também aparecem aqui.</p>
                  <p><strong>Carteira:</strong> Monitore o relacionamento com os clientes, veja a última vez que compraram e o volume total gerado por cada um.</p>
                  <p><strong>Crédito:</strong> Aprovações pendentes para vendas "Faturadas". O administrador pode definir um limite de crédito para clientes de confiança.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Gestão de Estoque</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground space-y-3 pt-2">
                  <p><strong>Estoque:</strong> Acompanhe todos os seus produtos. Você pode buscar por código, editar preços de custo e venda e alterar a foto da peça clicando no ícone da imagem.</p>
                  <p><strong>Estoque Baixo:</strong> Relatório automático mostrando produtos que estão com 2 ou menos unidades no estoque.</p>
                  <p><strong>Importar Estoque:</strong> Atualize seu estoque de forma massiva enviando uma planilha Excel. (Você pode baixar o modelo na própria aba).</p>
                  <p><strong>Cadastrar Produto:</strong> Adicione peças individualmente sem precisar de planilha.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Comercial (Regras e Preços)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground space-y-3 pt-2">
                  <p><strong>Markup:</strong> Configure a margem de lucro padrão. O sistema calculará automaticamente o preço de venda baseando-se no preço de custo do produto.</p>
                  <p><strong>Ofertas e Cupons:</strong> Crie promoções em itens específicos ou distribua cupons de desconto (ex: 10% off) para os clientes usarem no Catálogo B2B.</p>
                  <p><strong>Prazos (Faturamento):</strong> Configure os dias de prazo aceitos para o pagamento "Faturado" (ex: 30/60/90 dias).</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Equipe e Metas</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground space-y-3 pt-2">
                  <p><strong>Vendedores (Apenas Admin):</strong> Crie acessos para sua equipe. Defina exatamente quais abas cada vendedor poderá visualizar.</p>
                  <p><strong>Metas:</strong> Estipule o alvo de vendas mensal da equipe ou individual.</p>
                  <p><strong>Comissões e Relatório:</strong> Configure % de comissão ou valores fixos para cada vendedor e gere o relatório no fim do mês para acerto de contas.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Financeiro</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground space-y-3 pt-2">
                  <p><strong>Contas a Pagar:</strong> Lance suas despesas (como boletos de fornecedores), defina datas de vencimento e dê baixa nos pagamentos.</p>
                  <p><strong>Garantia:</strong> Registre as peças devolvidas pelos clientes, o motivo da devolução e acompanhe o envio dessas peças para o fabricante/fornecedor.</p>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

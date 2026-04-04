import { Composition } from "remotion";
import { VendasVideo } from "./videos/vendas/VendasVideo";
import { EstoqueVideo } from "./videos/estoque/EstoqueVideo";
import { ClientesVideo } from "./videos/clientes/ClientesVideo";
import { EquipeVideo } from "./videos/equipe/EquipeVideo";
import { FinanceiroVideo } from "./videos/financeiro/FinanceiroVideo";

export const MultiRoot = () => (
  <>
    <Composition id="vendas" component={VendasVideo} durationInFrames={665} fps={30} width={1920} height={1080} />
    <Composition id="estoque" component={EstoqueVideo} durationInFrames={500} fps={30} width={1920} height={1080} />
    <Composition id="clientes" component={ClientesVideo} durationInFrames={490} fps={30} width={1920} height={1080} />
    <Composition id="equipe" component={EquipeVideo} durationInFrames={490} fps={30} width={1920} height={1080} />
    <Composition id="financeiro" component={FinanceiroVideo} durationInFrames={500} fps={30} width={1920} height={1080} />
  </>
);

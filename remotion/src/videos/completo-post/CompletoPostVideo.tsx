import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Hero } from "./Scene1Hero";
import { Scene2Vendas } from "./Scene2Vendas";
import { Scene3Clientes } from "./Scene3Clientes";
import { Scene4Produtos } from "./Scene4Produtos";
import { Scene5Financeiro } from "./Scene5Financeiro";
import { Scene6Equipe } from "./Scene6Equipe";
import { Scene7Ajuda } from "./Scene7Ajuda";
import { Scene8Closing } from "./Scene8Closing";
import { PersistentBackground } from "../../components/PersistentBackground";

const t20 = springTiming({ config: { damping: 200 }, durationInFrames: 20 });
const t25 = springTiming({ config: { damping: 200 }, durationInFrames: 25 });

export const CompletoPostVideo = () => (
  <AbsoluteFill>
    <PersistentBackground />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={120}><Scene1Hero /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={240}><Scene2Vendas /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t20} />
      <TransitionSeries.Sequence durationInFrames={200}><Scene3Clientes /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={220}><Scene4Produtos /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={t20} />
      <TransitionSeries.Sequence durationInFrames={260}><Scene5Financeiro /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={190}><Scene6Equipe /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={t20} />
      <TransitionSeries.Sequence durationInFrames={190}><Scene7Ajuda /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={120}><Scene8Closing /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

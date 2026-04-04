import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Intro } from "./Scene1Intro";
import { Scene2NovaVenda } from "./Scene2NovaVenda";
import { Scene3Pedidos } from "./Scene3Pedidos";
import { Scene4Orcamento } from "./Scene4Orcamento";
import { Scene5Closing } from "./Scene5Closing";
import { PersistentBackground } from "../../components/PersistentBackground";

const t20 = springTiming({ config: { damping: 200 }, durationInFrames: 20 });
const t25 = springTiming({ config: { damping: 200 }, durationInFrames: 25 });

export const VendasVideo = () => (
  <AbsoluteFill>
    <PersistentBackground />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene1Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={180}>
        <Scene2NovaVenda />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t20} />
      <TransitionSeries.Sequence durationInFrames={170}>
        <Scene3Pedidos />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={170}>
        <Scene4Orcamento />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene5Closing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

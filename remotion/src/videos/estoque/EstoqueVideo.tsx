import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Intro } from "./Scene1Intro";
import { Scene2Consulta } from "./Scene2Consulta";
import { Scene3Features } from "./Scene3Features";
import { Scene4Closing } from "./Scene4Closing";
import { PersistentBackground } from "../../components/PersistentBackground";

const t20 = springTiming({ config: { damping: 200 }, durationInFrames: 20 });
const t25 = springTiming({ config: { damping: 200 }, durationInFrames: 25 });

// 120+170+170+110 = 570, transitions: 25+20+25 = 70 → 500 frames ≈ 17s
export const EstoqueVideo = () => (
  <AbsoluteFill>
    <PersistentBackground />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene1Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={170}>
        <Scene2Consulta />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t20} />
      <TransitionSeries.Sequence durationInFrames={170}>
        <Scene3Features />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={110}>
        <Scene4Closing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

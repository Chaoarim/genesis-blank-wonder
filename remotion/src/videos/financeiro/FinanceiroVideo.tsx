import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Intro, Scene2Dashboard, Scene3Features, Scene4Closing } from "./FinanceiroScenes";
import { PersistentBackground } from "../../components/PersistentBackground";

const t20 = springTiming({ config: { damping: 200 }, durationInFrames: 20 });
const t25 = springTiming({ config: { damping: 200 }, durationInFrames: 25 });

// 110+180+170+110 = 570, transitions: 25+20+25 = 70 → 500 frames
export const FinanceiroVideo = () => (
  <AbsoluteFill>
    <PersistentBackground />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={110}><Scene1Intro /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={180}><Scene2Dashboard /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t20} />
      <TransitionSeries.Sequence durationInFrames={170}><Scene3Features /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={110}><Scene4Closing /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

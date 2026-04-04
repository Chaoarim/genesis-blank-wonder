import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Intro, Scene2Clientes, Scene3CRM, Scene4Closing } from "./ClientesScenes";
import { PersistentBackground } from "../../components/PersistentBackground";

const t20 = springTiming({ config: { damping: 200 }, durationInFrames: 20 });
const t25 = springTiming({ config: { damping: 200 }, durationInFrames: 25 });

// 110+170+170+110 = 560, transitions: 25+20+25 = 70 → 490 frames
export const ClientesVideo = () => (
  <AbsoluteFill>
    <PersistentBackground />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={110}><Scene1Intro /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={170}><Scene2Clientes /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t20} />
      <TransitionSeries.Sequence durationInFrames={170}><Scene3CRM /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={110}><Scene4Closing /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

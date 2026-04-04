import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Hero } from "./scenes/Scene1Hero";
import { Scene2Dashboard } from "./scenes/Scene2Dashboard";
import { Scene3Search } from "./scenes/Scene3Search";
import { Scene4Features } from "./scenes/Scene4Features";
import { Scene5Closing } from "./scenes/Scene5Closing";
import { PersistentBackground } from "./components/PersistentBackground";

const t20 = springTiming({ config: { damping: 200 }, durationInFrames: 20 });
const t25 = springTiming({ config: { damping: 200 }, durationInFrames: 25 });

export const MainVideo = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene1Hero />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t25} />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene2Dashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t20} />
        <TransitionSeries.Sequence durationInFrames={160}>
          <Scene3Search />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t25} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t25} />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene5Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

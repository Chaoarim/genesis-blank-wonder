import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Hero } from "./scenes/Scene1Hero";
import { Scene2Dashboard } from "./scenes/Scene2Dashboard";
import { Scene3Search } from "./scenes/Scene3Search";
import { Scene4Catalog } from "./scenes/Scene4Catalog";
import { Scene5StockFinance } from "./scenes/Scene5StockFinance";
import { Scene6CRM } from "./scenes/Scene6CRM";
import { Scene7Team } from "./scenes/Scene7Team";
import { Scene8Closing } from "./scenes/Scene8Closing";
import { PersistentBackground } from "./components/PersistentBackground";

const t = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: t });

export const MainVideo = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene1Hero />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene2Dashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene3Search />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene4Catalog />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene5StockFinance />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene6CRM />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene7Team />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene8Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

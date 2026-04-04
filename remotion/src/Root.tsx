import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 8 scenes: 140+140+130+130+130+130+120+150 = 1070
// 7 transitions of 20 frames = 140 overlap
// Total: 1070 - 140 = 930 frames = 31s at 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={930}
    fps={30}
    width={1920}
    height={1080}
  />
);

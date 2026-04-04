import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 5 scenes: 140+170+160+150+170 = 790
// 4 transitions: 25+20+25+25 = 95 overlap
// Total: 790 - 95 = 695 frames ≈ 23s at 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={695}
    fps={30}
    width={1920}
    height={1080}
  />
);

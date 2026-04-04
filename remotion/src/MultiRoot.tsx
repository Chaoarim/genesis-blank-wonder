import { Composition } from "remotion";
import { VendasVideo } from "./videos/vendas/VendasVideo";

// Vendas: 120+180+170+170+120 = 760, transitions: 25+20+25+25 = 95 overlap → 665 frames ≈ 22s
export const MultiRoot = () => (
  <>
    <Composition
      id="vendas"
      component={VendasVideo}
      durationInFrames={665}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);

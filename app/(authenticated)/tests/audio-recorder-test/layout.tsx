import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <RouteHeaderData
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "audio-recorder-test")}
            moduleHome="/tests/audio-recorder-test"
            moduleName="Audio Recorder Tests"
        >
            {children}
        </RouteHeaderData>
    );
}

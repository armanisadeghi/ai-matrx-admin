import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function AudioRecorderTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "audio-recorder-test")}
            basePath="/legacy/tests/audio-recorder-test"
            title="Audio Recorder Tests"
        />
    );
}

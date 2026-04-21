import Breadcrumb from "@/components/tools/Breadcrumb";
import ImageSplitter from "./ImageSplitter";

export default function ImageSplitterPage() {
  return (
    <main className="min-h-screen bg-[#0a1628] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumb
          items={[
            { label: "NoviqLab", href: "/" },
            { label: "Tools", href: "/tools" },
            { label: "Image Splitter" },
          ]}
        />
        <ImageSplitter />
      </div>
    </main>
  );
}

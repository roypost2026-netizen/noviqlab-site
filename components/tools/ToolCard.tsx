import Link from "next/link";

interface ToolCardProps {
  slug: string;
  name: string;
  icon: string;
  description: string;
  tags: string[];
}

export default function ToolCard({ slug, name, icon, description, tags }: ToolCardProps) {
  return (
    <Link
      href={`/tools/${slug}`}
      className="block bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all group"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg text-white mb-2">{name}</h3>
      <p className="text-sm text-white/60 mb-4">{description}</p>
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono bg-white/10 text-white/70 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-sm text-sky-400 group-hover:text-sky-300 transition-colors flex-shrink-0">
          開く →
        </span>
      </div>
    </Link>
  );
}

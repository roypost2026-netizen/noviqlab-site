import Breadcrumb from "@/components/tools/Breadcrumb";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a1628] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Breadcrumb items={[{ label: "NoviqLab", href: "/" }, { label: "運営理念" }]} />

        {/* ヒーロー */}
        <section className="mt-10 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">NoviqLab について</h1>
          <p className="text-2xl md:text-3xl text-sky-400 font-semibold italic">
            Less, but better.
          </p>
          <p className="text-base text-white/70 mt-4 leading-relaxed">
            NoviqLab のツールは、機能の多さを競いません。
            <br />
            そのかわり、<strong className="text-white/90">一つひとつの機能を、深く考えて作っています</strong>。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* 私たちについて */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">私たちについて</h2>
          <p className="text-base text-white/80 leading-relaxed">
            NoviqLab は、有志による少人数のチームで開発・運営しています。
            <br />
            大企業のような組織構造はなく、日々の実務感覚を持ったメンバーが、
            <strong className="text-white/95">自分たちが本当に使いたい道具</strong>を形にしています。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* なぜ NoviqLab を始めたか */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">なぜ NoviqLab を始めたか</h2>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            きっかけはとてもシンプルでした。
            <br />
            「自分たちが毎日使うツールを、自分たちが気に入る形で作りたい」。
            <br />
            ただそれだけです。
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            でも「自分たちのため」に作っていたら、自然とこだわりが出てきました。
            <br />
            そのこだわりを、少しだけ言葉にしてみます。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* ツール開発で大切にしていること */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">ツール開発で大切にしていること</h2>
          <p className="text-base text-white/80 leading-relaxed mb-8">
            NoviqLab の各ツールは、以下の考え方で作られています。
          </p>

          <div className="space-y-10">
            <div>
              <h3 className="text-xl font-bold mb-3">説明書を読まなくても使える</h3>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                良いツールには、使い方の説明はほとんど必要ないはずです。
                <br />
                画面を見て、触って、わかる。
                <br />
                私たちはそれを理想だと考えています。
              </p>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                もちろん、仕組みを詳しく知りたい方もいます。
                <br />
                そのため、NoviqLab のツールには「使い方」というリンクを目立たない場所に置いています。
              </p>
              <div className="bg-white/5 border-l-2 border-sky-400 pl-4 py-2 my-4">
                <p className="text-base text-white/90 leading-relaxed">
                  <strong>知りたい人だけが、掘り下げられる。</strong>
                  <br />
                  <strong>知りたくない人には、見えない。</strong>
                </p>
              </div>
              <p className="text-base text-white/80 leading-relaxed">
                この「階層」こそが、シンプルさと親切さを両立する方法だと信じています。
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">機能を足すより、削ることを先に考える</h3>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                ツールに機能を追加するのは、とても簡単です。
                <br />
                でも、使う人にとって「選択肢が増える」ことは、必ずしも嬉しいことではありません。
                <br />
                迷う時間、探す時間、学ぶ時間。それらは確実に増えます。
              </p>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                だから、新しい機能を作るたびに自問しています。
                <br />
                「これは本当に必要か？ 別の方法で解決できないか？」
              </p>
              <p className="text-base text-white/80 leading-relaxed">
                <strong className="text-white/95">
                  「作らない」という判断が、最も勇気のいる設計判断
                </strong>
                だと考えています。
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">ツール利用時、使う人を追跡しない</h3>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                Web 上には、画像をアップロードした瞬間にサーバーに送られたり、
                クリックするたびに広告企業にデータが送られたりするツールがたくさんあります。
              </p>
              <p className="text-base text-white/80 leading-relaxed mb-3">
                私たちはそういうツールを使いたくありません。
                <br />
                だから、NoviqLab の<strong className="text-white/95">ツールページ</strong>にはそれらを一切入れていません。
              </p>
              <p className="text-base text-white/80 leading-relaxed">
                自分たちが使いたくないものを、他の人に使わせるわけにはいかない。
                <br />
                それは当たり前のことだと思っています。
              </p>
            </div>
          </div>
        </section>

        <hr className="border-white/10 my-12" />

        {/* プライバシー方針 (id="privacy" でアンカー対応) */}
        <section className="mb-12" id="privacy">
          <h2 className="text-2xl font-bold mb-4">ツール利用時のプライバシー方針</h2>
          <p className="text-base text-white/80 leading-relaxed mb-6">
            NoviqLab の<strong className="text-white/95">各種ツール（/tools 配下）</strong>では、以下のポリシーを
            <strong className="text-white/95">例外なく</strong>守っています。
          </p>

          <ul className="space-y-6">
            <li className="bg-white/5 rounded-xl p-5">
              <p className="text-lg font-bold mb-2">🔒 画像や入力データはサーバーに送信されません</p>
              <p className="text-base text-white/80 leading-relaxed">
                すべての処理はお使いのブラウザ内で完結します。
              </p>
            </li>
            <li className="bg-white/5 rounded-xl p-5">
              <p className="text-lg font-bold mb-2">🚫 ツール利用時に追跡 Cookie は使用していません</p>
              <p className="text-base text-white/80 leading-relaxed">
                ログインも、ユーザー識別もありません。
              </p>
            </li>
            <li className="bg-white/5 rounded-xl p-5">
              <p className="text-lg font-bold mb-2">
                ⛔ ツールページでは Google Analytics / Meta Pixel などのトラッカーを一切読み込みません
              </p>
              <p className="text-base text-white/80 leading-relaxed">
                データ収集の有無を、ページを開くだけで DevTools で確認できます。
              </p>
            </li>
          </ul>

          <p className="text-base text-white/70 leading-relaxed mt-6 italic">
            これは法律上の義務ではありません。
            <br />
            ただ、<strong className="text-white/85">自分たちが使いたいツールの条件</strong>
            として、私たちがそう決めているだけです。
          </p>
        </section>

        <hr className="border-white/10 my-12" />

        {/* サイト全体の運営について */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">サイト全体の運営について</h2>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            ツールページ以外（トップページ、お知らせ、ブログ等）では、
            将来的にアクセス解析や広告機能を導入する可能性があります。
            <br />
            その場合は、このページで明示的にお知らせします。
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            ただし、<strong className="text-white/95">ツールページそのものには影響させません</strong>。
            <br />
            上記のプライバシー方針は、NoviqLab のツールを使う限り、変わりません。
          </p>
          <div className="mt-6 bg-sky-500/10 border border-sky-400/20 rounded-xl p-4">
            <p className="text-sm text-white/80 leading-relaxed">
              <strong className="text-sky-300">現在のアクセス解析状況:</strong>
              <br />
              サイト全体で Cloudflare Web Analytics を使用しています。
              Cookie や IP アドレスは記録されません。
            </p>
          </div>
        </section>

        <hr className="border-white/10 my-12" />

        {/* これから */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">これから</h2>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            NoviqLab はまだ始まったばかりのプロジェクトです。
            <br />
            少しずつツールを増やしながら、試行錯誤の記録を共有していきます。
          </p>
          <p className="text-base text-white/80 leading-relaxed mb-4">
            多機能だけれど誰にも最適化されていないものより、
            <br />
            <strong className="text-white/95">シンプルだけれど本当に使える道具</strong>を届けていきたいと思っています。
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            気になる点や、こうだったら嬉しいという要望があれば、
            <br />
            ぜひお気軽にご連絡ください。
          </p>
        </section>

        {/* Contact */}
        <section className="mb-12 text-center">
          <a
            href="/#contact"
            className="inline-block bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            お問い合わせはこちら
          </a>
        </section>

        {/* フッター帯 */}
        <hr className="border-white/10 my-12" />
        <p className="text-center text-sm text-white/40 italic">
          NoviqLab · Tokyo · 2026
        </p>
      </div>
    </main>
  );
}

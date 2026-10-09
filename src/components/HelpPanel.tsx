import content from '../help/content.json';
export type HelpTopic = typeof content.topics[number]['id'];
export function HelpPanel({ topic, onTopic, onGuide }: { topic: HelpTopic; onTopic: (id: HelpTopic) => void; onGuide: () => void }) {
  const section = content.topics.find(item => item.id === topic) ?? content.topics[0];
  return <div className="help-layout">
    <nav className="help-nav" aria-label="ヘルプの目次">{content.topics.map(item =>
      <button key={item.id} aria-pressed={item.id === section.id} onClick={() => onTopic(item.id)}>{item.title}</button>)}</nav>
    <section className="help-body" aria-label="使い方の説明" tabIndex={0} key={section.id}>
      <h3>{section.title}</h3>
      {section.id === 'first' && <><p>{content.intro}</p><button className="primary" onClick={onGuide}>はじめてガイドを開始</button></>}
      {section.paragraphs.map(text => <p key={text}>{text}</p>)}
      {!!section.steps.length && <ol>{section.steps.map(text => <li key={text}>{text}</li>)}</ol>}
      {section.id === 'shortcuts' && <table className="help-shortcuts"><caption>キーとできること</caption><thead><tr><th scope="col">キー</th><th scope="col">できること</th></tr></thead><tbody>{content.shortcuts.map(item => <tr key={item.key}><th scope="row">{item.key}</th><td>{item.text}</td></tr>)}</tbody></table>}
      {(section.id === 'faq' || section.id === 'troubleshooting') && (section.id === 'faq' ? content.faq : content.troubleshooting).map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
      {section.image && <figure><img src={`${import.meta.env.BASE_URL}manuals/images/${section.image}`} alt={section.caption} loading="lazy" /><figcaption>{section.caption}</figcaption></figure>}
      <div className="help-doc-links"><h4>別の画面でマニュアルを見る</h4><a href={`${import.meta.env.BASE_URL}manuals/index.html#${section.id}`} target="_blank" rel="noreferrer">画像付き完全マニュアル（新しいタブ）</a><a href={`${import.meta.env.BASE_URL}manuals/QUICK_START.md`} target="_blank" rel="noreferrer">最短操作ガイド</a><a href={`${import.meta.env.BASE_URL}manuals/SHORTCUTS.md`} target="_blank" rel="noreferrer">ショートカット一覧</a><a href={`${import.meta.env.BASE_URL}manuals/FAQ.md`} target="_blank" rel="noreferrer">よくある質問</a></div>
      <p className="license-copy">SRT Tap Timer v1.64.2を参考にした独立アプリ。Copyright © 2026 cityedge / MIT License. <a href={`${import.meta.env.BASE_URL}LICENSE-SRT-Tap-Timer.txt`} target="_blank" rel="noreferrer">原作者のライセンス</a>・<a href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.txt`} target="_blank" rel="noreferrer">第三者表記</a></p>
    </section>
  </div>;
}

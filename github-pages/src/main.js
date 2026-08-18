const labels = { all:"すべて", launch:"新発売", recall:"回収", discontinued:"中止・終了", store:"店舗ニュース", general:"一般" };
const readKey = "kampo-herbal-news-read-v1";
const state = { category:"all", unreadOnly:false, read:new Set(JSON.parse(localStorage.getItem(readKey) || "[]")), data:null };

const formatDate = value => new Intl.DateTimeFormat("ja-JP", { timeZone:"Asia/Tokyo", year:"numeric", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }).format(new Date(value)) + " JST";
const saveRead = () => localStorage.setItem(readKey, JSON.stringify([...state.read]));

function render() {
  const { data } = state;
  document.querySelector("#updated-at").textContent = data.updatedAt ? `最終更新 ${formatDate(data.updatedAt)}` : "初回確認を準備中";
  const cov = data.coverage;
  document.querySelector("#coverage").innerHTML = `<div><b>日漢協会員企業を対象に公式情報を収集</b><small>会員 ${cov.memberCompanies}社 ／ 公式告知監視 ${cov.officialSources}社 ／ PMDA補完監視 ${cov.pmdaFallbackCompanies}社。直近24時間の確認：${cov.checkedCompanies}社、公式到達 ${cov.successfulCompanies}社、到達不能 ${cov.failedCompanies}社。</small></div>`;
  const filters = document.querySelector("#filters"); filters.innerHTML = "";
  Object.entries(labels).forEach(([id,label]) => { const count = id === "all" ? data.articles.length : data.articles.filter(a => a.category === id).length; const button = document.createElement("button"); button.className = `filter${state.category === id ? " active" : ""}`; button.textContent = `${label} (${count})`; button.onclick = () => { state.category=id; render(); }; filters.append(button); });
  const unreadButton = document.querySelector("#unread-toggle"); unreadButton.classList.toggle("active",state.unreadOnly); unreadButton.textContent = state.unreadOnly ? "未読のみ：ON" : "未読のみ"; unreadButton.onclick = () => { state.unreadOnly=!state.unreadOnly; render(); };
  const selected = data.articles.filter(a => (state.category === "all" || a.category === state.category) && (!state.unreadOnly || !state.read.has(a.id)));
  const grid = document.querySelector("#news"); grid.innerHTML = "";
  if (!selected.length) { grid.innerHTML = `<div class="empty">該当するニュースはありません。回収・中止／終了は公式情報を確認し、該当がない場合は次回確認で再照合します。</div>`; return; }
  const template = document.querySelector("#article-template"); selected.forEach(article => { const fragment = template.content.cloneNode(true); const card = fragment.querySelector("article"); const read = state.read.has(article.id); card.classList.toggle("read",read); const badge = fragment.querySelector(".badge"); badge.classList.add(article.category); badge.textContent = labels[article.category] || labels.general; fragment.querySelector("time").textContent = article.category === "launch" && article.launchDate ? `発売日：${article.launchDate}` : `公式告知日 ${formatDate(article.publishedAt)}`; fragment.querySelector("h2").textContent = article.title; fragment.querySelector(".product").textContent = article.productNames?.length ? `製品：${article.productNames.join("／")}` : ""; fragment.querySelector(".summary").textContent = article.summary; fragment.querySelector(".source").textContent = article.sourceName; const readButton = fragment.querySelector(".read-button"); readButton.textContent = read ? "未読に戻す" : "既読にする"; readButton.onclick = () => { read ? state.read.delete(article.id) : state.read.add(article.id); saveRead(); render(); }; const link = fragment.querySelector(".source-link"); link.href = article.sourceUrl; grid.append(fragment); });
}

fetch("./data/news.json", { cache:"no-store" }).then(response => response.json()).then(data => { state.data=data; render(); }).catch(() => { document.querySelector("#news").innerHTML = "<div class='empty'>ニュースデータを取得できませんでした。数分後に再試行してください。</div>"; });

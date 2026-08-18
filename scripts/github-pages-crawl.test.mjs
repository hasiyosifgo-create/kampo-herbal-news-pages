import test from "node:test";
import assert from "node:assert/strict";
import { chooseShard, classifyTitle, parseMembers } from "./github-pages-crawl.mjs";

test("uses a five-minute bucket to rotate through three shards", () => { assert.equal(chooseShard(new Date(0)),0); assert.equal(chooseShard(new Date(300000)),1); assert.equal(chooseShard(new Date(600000)),2); });
test("extracts registered official member sources", () => { const members=parseMembers('{ company: "A社", url: "https://a.example/news", sourceType: "news_list" }'); assert.deepEqual(members,[{company:"A社",url:"https://a.example/news",sourceType:"news_list"}]); });
test("classifies only Kampo or crude-drug product notices", () => { assert.equal(classifyTitle("漢方製剤の自主回収のお知らせ"),"recall"); assert.equal(classifyTitle("漢方薬を新発売"),"launch"); assert.equal(classifyTitle("化粧品の新発売"),null); assert.equal(classifyTitle("会社説明会を開催"),null); });
test("keeps general Kampo notices separate from product measures", () => { assert.equal(classifyTitle("漢方製剤の供給に関するお知らせ"),"general"); });
test("does not infer Kampo relevance from generic product names", () => { assert.equal(classifyTitle("龍角散の新商品を発売"),null); });

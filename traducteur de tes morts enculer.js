let t=(t,l="fr")=>fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl="+l+"&dt=t&q="+encodeURIComponent(t)).then(r=>r.json()).then(d=>d[0].map(x=>x[0]).join(""))

t("hello world").then(console.log)
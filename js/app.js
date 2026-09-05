(() => {
  const C = window.APP_CONFIG;
  const sb = (C.SUPABASE_URL && !C.SUPABASE_URL.startsWith("YOUR_")) && window.supabase
    ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  window.NA = { sb, C };

  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  window.escapeHtml = escapeHtml;

  function cart(){ try{return JSON.parse(localStorage.getItem('na_cart')||'[]')}catch{return[]}}
  function saveCart(x){localStorage.setItem('na_cart',JSON.stringify(x)); updateCount()}
  window.updateCount=()=>{const e=document.getElementById('cartCount');if(e)e.textContent=cart().length}
  window.addToCart=id=>{let c=cart();if(!c.includes(id))c.push(id);saveCart(c);toast('Added to cart.')}
  window.removeFromCart=id=>{saveCart(cart().filter(x=>x!==id)); location.reload()}
  window.toast=m=>{let e=document.getElementById('toast');if(!e){e=document.createElement('div');e.id='toast';e.style='position:fixed;right:20px;bottom:20px;background:#171717;color:#fff;padding:14px 18px;z-index:99;font:11px Georgia';document.body.appendChild(e)}e.textContent=m;e.hidden=false;setTimeout(()=>e.hidden=true,2200)}
  window.money=c=>'$'+(Number(c)/100).toFixed(2);

  const fallback = [
    {id:'demo1',title:'Autumn Lake',description:'A quiet New England lake surrounded by autumn foliage.',price_cents:800,category:'Autumn',tags:['autumn','lake','nature','new england'],preview_path:'demo',image:'assets/autumn.svg'},
    {id:'demo2',title:'Coastal Light',description:'Soft light across a quiet coastal landscape.',price_cents:1000,category:'Coast',tags:['coast','ocean','landscape','light'],preview_path:'demo',image:'assets/coast.svg'},
    {id:'demo3',title:'Mountain Morning',description:'Morning light over a distant mountain ridge.',price_cents:1200,category:'Mountains',tags:['mountains','sunrise','landscape','nature'],preview_path:'demo',image:'assets/mountain.svg'},
    {id:'demo4',title:'Red Maple',description:'A close study of brilliant autumn leaves.',price_cents:600,category:'Nature',tags:['red','maple','autumn','leaves'],preview_path:'demo',image:'assets/maple.svg'},
    {id:'demo5',title:'Quiet Water',description:'Reflections across still water at dusk.',price_cents:700,category:'Nature',tags:['water','reflection','dusk','landscape'],preview_path:'demo',image:'assets/water.svg'},
    {id:'demo6',title:'The Old Barn',description:'A weathered barn beneath an open sky.',price_cents:900,category:'Architecture',tags:['barn','architecture','rural','sky'],preview_path:'demo',image:'assets/barn.svg'}
  ];

  async function getPhotos(){
    if(!sb) return fallback;
    const {data,error}=await sb.from('photos').select('*').eq('published',true).order('created_at',{ascending:false});
    if(error){console.error(error);return fallback}
    return data.map(p=>({...p,image:sb.storage.from('photo-previews').getPublicUrl(p.preview_path).data.publicUrl}));
  }
  window.getPhotos=getPhotos;

  window.renderPhotos=(el,arr)=>{
    if(!arr.length){el.innerHTML='<div class="empty"><h2>No photographs found.</h2></div>';return}
    el.innerHTML=arr.map(p=>`<article class="card"><a href="photo.html?id=${encodeURIComponent(p.id)}"><img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy"></a><h3><a href="photo.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a><span class="price">${money(p.price_cents)}</span></h3><p>${escapeHtml(p.category)}</p></article>`).join('')
  }

  window.loadPhoto=async()=>{
    const id=new URLSearchParams(location.search).get('id'), el=document.getElementById('photo');
    const ps=await getPhotos(), p=ps.find(x=>x.id===id);
    if(!p){el.innerHTML='<div class="empty"><h1>Photograph not found.</h1><a class="button" href="gallery.html">Return to archive</a></div>';return}
    document.title=p.title+' — Northlight Archive';
    el.innerHTML=`<div class="photo-large"><img src="${p.image}" alt="${escapeHtml(p.title)}"></div><div class="photo-info"><p class="eyebrow">${escapeHtml(p.category)}</p><h1>${escapeHtml(p.title)}</h1><p>${escapeHtml(p.description)}</p><div class="tags">${(p.tags||[]).map(t=>'<span>'+escapeHtml(t)+'</span>').join('')}</div><div class="purchase"><strong>${money(p.price_cents)}</strong><button class="button" onclick="addToCart('${p.id}')">Add to cart</button></div></div>`
  }

  window.renderGallery=async()=>{
    const all=await getPhotos(), q=document.getElementById('search'),cat=document.getElementById('category');
    [...new Set(all.map(p=>p.category).filter(Boolean))].sort().forEach(c=>cat.insertAdjacentHTML('beforeend',`<option>${escapeHtml(c)}</option>`));
    const initial=new URLSearchParams(location.search).get('category');if(initial)cat.value=initial;
    const update=()=>{let s=q.value.toLowerCase().trim(),c=cat.value;let a=all.filter(p=>(!s||[p.title,p.description,p.category,...(p.tags||[])].join(' ').toLowerCase().includes(s))&&(!c||p.category===c));renderPhotos(document.getElementById('results'),a)}
    q.oninput=update;cat.onchange=update;update()
  }

  window.renderCollections=async()=>{
    const all=await getPhotos(), el=document.getElementById('collections'), names=[...new Set(all.map(p=>p.category).filter(Boolean))];
    if(!names.length){el.innerHTML='<div class="empty"><h2>Collections will appear here.</h2></div>';return}
    names.forEach(n=>{let p=all.find(x=>x.category===n);el.insertAdjacentHTML('beforeend',`<a class="collection" href="gallery.html?category=${encodeURIComponent(n)}"><img src="${p.image}" alt="" loading="lazy"><div><span>${escapeHtml(n)}</span><h2>${escapeHtml(n)}</h2></div></a>`)})
  }

  window.renderCart=async el=>{
    const all=await getPhotos(),items=cart().map(id=>all.find(p=>p.id===id)).filter(Boolean);
    if(!items.length){el.innerHTML='<div class="empty"><h2>Your cart is empty.</h2><a class="button" href="gallery.html">Browse photographs</a></div>';return}
    const total=items.reduce((s,p)=>s+p.price_cents,0);
    el.innerHTML=items.map(p=>`<div class="cart-item"><img src="${p.image}" alt=""><div><h2>${escapeHtml(p.title)}</h2><p class="muted">${escapeHtml(p.category)}</p></div><div>${money(p.price_cents)}<br><button class="remove" onclick="removeFromCart('${p.id}')">Remove</button></div></div>`).join('')+`<div class="cart-total"><span>Total</span><strong>${money(total)}</strong></div><div style="text-align:right"><a class="button" href="checkout.html">Checkout</a></div>`
  }

  window.renderSummary=async el=>{
    const all=await getPhotos(),items=cart().map(id=>all.find(p=>p.id===id)).filter(Boolean),total=items.reduce((s,p)=>s+p.price_cents,0);
    el.innerHTML='<h2>Order</h2>'+items.map(p=>`<div class="summary-row"><span>${escapeHtml(p.title)}</span><span>${money(p.price_cents)}</span></div>`).join('')+`<hr><div class="summary-row"><strong>Total</strong><strong>${money(total)}</strong></div>`;
  }

  window.requireAdmin=async()=>{
    if(!sb){document.getElementById('appError').textContent='Configure Supabase in js/config.js first.';return null}
    const {data:{session}}=await sb.auth.getSession();if(!session){document.getElementById('login').hidden=false;document.getElementById('panel').hidden=true;return null}
    document.getElementById('login').hidden=true;document.getElementById('panel').hidden=false;return session
  }

  window.signIn=async()=>{
    const email=document.getElementById('email').value.trim(),pass=document.getElementById('password').value;
    const {error}=await sb.auth.signInWithPassword({email,password:pass});if(error)return alert(error.message);location.reload()
  }
  window.signOut=async()=>{await sb.auth.signOut();location.reload()}

  window.adminRefresh=async()=>{
    const {data:photos,error}=await sb.from('photos').select('*').order('created_at',{ascending:false});
    if(error)return alert(error.message);
    document.getElementById('photoStat').textContent=photos.length;
    const {data:orders}=await sb.from('orders').select('total_cents,status');
    const paid=(orders||[]).filter(o=>o.status==='paid');document.getElementById('salesStat').textContent=paid.length;document.getElementById('revenueStat').textContent=money(paid.reduce((s,o)=>s+o.total_cents,0));
    document.getElementById('adminPhotos').innerHTML=photos.map(p=>{let u=sb.storage.from('photo-previews').getPublicUrl(p.preview_path).data.publicUrl;return `<div><img src="${u}" alt=""><span><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.category)} · ${money(p.price_cents)} · ${p.published?'Published':'Hidden'}</small></span><button onclick="deletePhoto('${p.id}','${escapeHtml(p.preview_path)}','${escapeHtml(p.original_path)}')">Delete</button></div>`}).join('');
    const os=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(50);document.getElementById('orders').innerHTML=(os.data||[]).map(o=>`<div class="order"><div class="order-grid"><span><b>${escapeHtml(o.id)}</b><br><small>${escapeHtml(o.customer_email||'')}</small></span><span>${money(o.total_cents)}</span><span>${escapeHtml(o.status)}</span></div></div>`).join('')||'<p class="muted">No orders yet.</p>'
  }

  window.publishPhoto=async()=>{
    const file=document.getElementById('file').files[0];if(!file)return alert('Choose a photograph.');
    const title=document.getElementById('title').value.trim();if(!title)return alert('Enter a title.');
    if(!sb)return;
    const id=crypto.randomUUID(), ext=(file.name.split('.').pop()||'jpg').toLowerCase(), original=`${id}.${ext}`, preview=`${id}.jpg`;
    const {error:oe}=await sb.storage.from('photo-originals').upload(original,file,{upsert:false,contentType:file.type});
    if(oe)return alert(oe.message);
    const bitmap=await createImageBitmap(file), scale=Math.min(1,1600/bitmap.width),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.84));
    const {error:pe}=await sb.storage.from('photo-previews').upload(preview,blob,{upsert:false,contentType:'image/jpeg'});
    if(pe){await sb.storage.from('photo-originals').remove([original]);return alert(pe.message)}
    const tags=document.getElementById('tags').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    const {error:de}=await sb.from('photos').insert({id,title,description:document.getElementById('desc').value.trim(),price_cents:Math.round((Number(document.getElementById('price').value)||0)*100),category:document.getElementById('cat').value.trim()||'Uncategorized',tags,preview_path:preview,original_path:original,published:document.getElementById('published').checked});
    if(de){await sb.storage.from('photo-previews').remove([preview]);await sb.storage.from('photo-originals').remove([original]);return alert(de.message)}
    document.getElementById('photoForm').reset();alert('Photograph published.');adminRefresh()
  }

  window.deletePhoto=async(id,preview,original)=>{
    if(!confirm('Delete this photograph?'))return;
    const {error}=await sb.from('photos').delete().eq('id',id);if(error)return alert(error.message);
    await sb.storage.from('photo-previews').remove([preview]);await sb.storage.from('photo-originals').remove([original]);adminRefresh()
  }

  window.checkoutInit=async()=>{
    const all=await getPhotos(),items=cart().map(id=>all.find(p=>p.id===id)).filter(Boolean),total=items.reduce((s,p)=>s+p.price_cents,0);
    await renderSummary(document.getElementById('summary'));
    if(!items.length){document.getElementById('payArea').innerHTML='<p>Your cart is empty.</p>';return}
    if(!C.PAYPAL_CLIENT_ID||C.PAYPAL_CLIENT_ID.startsWith('YOUR_')){document.getElementById('payArea').innerHTML='<div class="notice"><strong>Payment setup required.</strong><br>Set your PayPal Client ID and Supabase function URL in <code>js/config.js</code> after completing SETUP.md.</div>';return}
    const s=document.createElement('script');s.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(C.PAYPAL_CLIENT_ID)}&currency=USD&components=buttons&enable-funding=venmo`;s.onload=()=>paypal.Buttons({
      createOrder:async()=>{const r=await fetch(C.SUPABASE_FUNCTION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',photo_ids:cart(),email:document.getElementById('customerEmail').value.trim()})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not create order');return j.id},
      onApprove:async data=>{const r=await fetch(C.SUPABASE_FUNCTION_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'capture',paypal_order_id:data.orderID,email:document.getElementById('customerEmail').value.trim()})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Payment could not be captured');localStorage.setItem('na_last_order',JSON.stringify(j));localStorage.setItem('na_cart','[]');location.href='success.html'},
      onError:e=>alert(e.message||'Payment error'),
      onCancel:()=>toast('Payment cancelled.')
    }).render('#paypal-buttons');document.body.appendChild(s)
  }
  window.updateCount(); if(document.getElementById('year'))document.getElementById('year').textContent=new Date().getFullYear();
})();
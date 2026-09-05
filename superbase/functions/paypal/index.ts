import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status=200) =>
  new Response(JSON.stringify(body), { status, headers: {...cors, "Content-Type":"application/json"} });

async function paypalToken() {
  const id=Deno.env.get("PAYPAL_CLIENT_ID")!, secret=Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const base=Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.paypal.com";
  const auth=btoa(`${id}:${secret}`);
  const r=await fetch(`${base}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
  if(!r.ok) throw new Error("PayPal authentication failed");
  return {token:(await r.json()).access_token,base};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    const body=await req.json();
    const service=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if(body.action==="create"){
      const ids=Array.isArray(body.photo_ids)?body.photo_ids:[];
      if(!ids.length || ids.length>50) return json({error:"Invalid cart"},400);
      const {data:photos,error}=await service.from("photos").select("id,title,price_cents,published").in("id",ids);
      if(error||!photos||photos.length!==ids.length||photos.some(p=>!p.published)) return json({error:"One or more photographs are unavailable"},400);
      const total=photos.reduce((s,p)=>s+p.price_cents,0);
      const {token,base}=await paypalToken();
      const r=await fetch(`${base}/v2/checkout/orders`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({
        intent:"CAPTURE",
        purchase_units:[{amount:{currency_code:"USD",value:(total/100).toFixed(2)},custom_id:ids.join(",") }]
      })});
      const j=await r.json(); if(!r.ok)return json({error:j.message||"PayPal order failed"},400);
      return json({id:j.id});
    }

    if(body.action==="capture"){
      if(!body.paypal_order_id)return json({error:"Missing PayPal order ID"},400);
      const {token,base}=await paypalToken();
      const r=await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(body.paypal_order_id)}/capture`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}});
      const j=await r.json(); if(!r.ok)return json({error:j.message||"Capture failed"},400);
      if(j.status!=="COMPLETED")return json({error:"Payment was not completed"},400);

      const unit=j.purchase_units?.[0]; const ids=(unit?.payments?.captures?.[0]?.custom_id||"").split(",").filter(Boolean);
      if(!ids.length) return json({error:"Order items could not be verified"},400);
      const {data:photos}=await service.from("photos").select("id,title,price_cents,original_path").in("id",ids);
      if(!photos||photos.length!==ids.length)return json({error:"Some photographs are unavailable"},400);
      const total=photos.reduce((s,p)=>s+p.price_cents,0);
      const {data:order,error:oe}=await service.from("orders").insert({paypal_order_id:body.paypal_order_id,customer_email:body.email||null,total_cents:total,status:"paid"}).select("id").single();
      if(oe) return json({error:"Payment succeeded but order recording failed. Contact support with PayPal order "+body.paypal_order_id},500);
      await service.from("order_items").insert(photos.map(p=>({order_id:order.id,photo_id:p.id,title_snapshot:p.title,price_cents:p.price_cents})));

      const downloads=[];
      for(const p of photos){const {data,error}=await service.storage.from("photo-originals").createSignedUrl(p.original_path,60*60*24*7);if(!error&&data?.signedUrl)downloads.push({title:p.title,url:data.signedUrl})}
      return json({order_id:order.id,paypal_order_id:body.paypal_order_id,downloads});
    }

    return json({error:"Unknown action"},400);
  }catch(e){return json({error:e instanceof Error?e.message:"Server error"},500)}
});
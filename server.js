require('dotenv').config();
const express=require('express'),Database=require('better-sqlite3'),bcrypt=require('bcryptjs'),session=require('express-session'),multer=require('multer'),rate=require('express-rate-limit'),path=require('path'),fs=require('fs'),crypto=require('crypto');
const DB=path.resolve(__dirname,process.env.DB_PATH||'data/mania.db');fs.mkdirSync(path.dirname(DB),{recursive:true});
const up=path.join(__dirname,'public/uploads');fs.mkdirSync(up,{recursive:true});
const db=new Database(DB);db.pragma('journal_mode=WAL');db.pragma('foreign_keys=ON');
db.exec(fs.readFileSync(path.join(__dirname,'database/init.sql'),'utf8'));
const ensureColumn=(table,column,definition)=>{const cols=db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name);if(!cols.includes(column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)};
ensureColumn('products','image2','TEXT');
ensureColumn('products','featured','INTEGER NOT NULL DEFAULT 0');
ensureColumn('orders','payment_method',"TEXT NOT NULL DEFAULT 'a_combinar'");
if(!db.prepare('SELECT 1 FROM users').get()){const e=(process.env.ADMIN_EMAIL||'').toLowerCase(),p=process.env.ADMIN_PASSWORD||'';
 if(e&&p.length>=10){db.prepare('INSERT INTO users(email,hash) VALUES(?,?)').run(e,bcrypt.hashSync(p,12));console.log('Administrador criado: '+e+' (remova ADMIN_PASSWORD do .env)')}
 else console.warn('Nenhum administrador. Defina ADMIN_EMAIL e ADMIN_PASSWORD (10+ caracteres) no .env e reinicie.')}
const R=c=>'R$ '+(c/100).toFixed(2).replace('.',',');
const cents=v=>{if(v===''||v==null)return null;const n=Math.round(parseFloat(String(v).replace(',','.'))*100);return Number.isFinite(n)&&n>=0?n:NaN};
const int=v=>{const n=Number(v);return Number.isInteger(n)&&n>=0?n:NaN};
const cfg=()=>Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(r=>[r.key,r.value]));
const ST=['aguardando_atendimento','em_atendimento','aguardando_pagamento','confirmado','em_preparacao','pronto','concluido','cancelado'];
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');
app.use(express.json({limit:'100kb'}));
app.use(session({name:'ma.sid',secret:process.env.SESSION_SECRET||crypto.randomBytes(32).toString('hex'),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:864e5}}));
app.use((q,s,n)=>{s.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'});if(q.method!=='GET'&&q.get('X-Requested-With')!=='fetch')return s.status(403).json({error:'Requisição inválida'});n()});
app.use(express.static(path.join(__dirname,'public')));
const A=(q,s,n)=>q.session.uid?n():s.status(401).json({error:'Não autenticado'});
// ---- público
app.get('/api/store',(q,s)=>{const c=cfg();s.json({whatsapp:c.whatsapp,instagram:c.instagram,hours:c.hours,address:c.address,address2:c.address2,about:c.about,categories:db.prepare('SELECT id,name FROM categories ORDER BY id').all()})});
app.get('/api/products',(q,s)=>s.json(db.prepare(`SELECT p.id,p.sku,p.name,p.description,p.category_id,c.name category,p.price_cents,p.promo_cents,p.stock,p.image,p.image2,p.featured FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1 AND p.stock>0 ORDER BY p.name`).all()));
app.post('/api/orders',(q,s)=>{
 const b=q.body,name=String(b.name||'').trim().slice(0,100),phone=String(b.phone||'').trim().slice(0,30),delivery=b.delivery==='entrega'?'entrega':'retirada',addr=String(b.address||'').trim().slice(0,250),payment=['dinheiro','pix','credito','debito','boleto'].includes(b.payment_method)?b.payment_method:'',items=Array.isArray(b.items)?b.items:[];
 let num=String(cfg().whatsapp).replace(/\D/g,'');if(!num)return s.status(409).json({error:'O WhatsApp da loja ainda não foi configurado.'});if(num.length<=11)num='55'+num;
 if(!name||!payment||!items.length||items.length>50||(delivery==='entrega'&&!addr))return s.status(400).json({error:'Informe nome, forma de pagamento, itens e, para entrega, o endereço.'});
 try{const r=db.transaction(()=>{let total=0;const rows=[];
  for(const it of items){const qty=int(it.qty),p=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(it.id);
   if(!p||!(qty>0))throw new Error('Item inválido.');
   if(db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').run(qty,p.id,qty).changes!==1)throw new Error('Estoque insuficiente para '+p.name+'.');
   const u=p.promo_cents??p.price_cents;total+=u*qty;rows.push({p,qty,u})}
  const code='MA-'+crypto.randomBytes(3).toString('hex').toUpperCase();
  const oid=db.prepare('INSERT INTO orders(code,customer_name,customer_phone,delivery,address,total_cents,payment_method) VALUES(?,?,?,?,?,?,?)').run(code,name,phone,delivery,addr,total,payment).lastInsertRowid;
  for(const x of rows){db.prepare('INSERT INTO order_items(order_id,product_id,name,unit_cents,qty) VALUES(?,?,?,?,?)').run(oid,x.p.id,x.p.name,x.u,x.qty);db.prepare('INSERT INTO stock_moves(product_id,delta,reason,order_id) VALUES(?,?,?,?)').run(x.p.id,-x.qty,'Pedido '+code,oid)}
  return{code,total,rows}})();
  const text=`Olá! Fiz o pedido ${r.code} no site da Mania de Aromas:\n`+r.rows.map(x=>`• ${x.qty}x ${x.p.name} — ${R(x.u*x.qty)}`).join('\n')+`\nTotal: ${R(r.total)}\nPagamento: ${{dinheiro:'À vista — dinheiro',pix:'À vista — Pix',credito:'Cartão de crédito',debito:'Cartão de débito',boleto:'Boleto'}[payment]}\nNome: ${name}\n${delivery==='entrega'?'Entrega: '+addr:'Retirada na loja'}\nAguardo a confirmação.`;
  s.json({code:r.code,total_cents:r.total,whatsapp:`https://wa.me/${num}?text=${encodeURIComponent(text)}`})
 }catch(e){s.status(409).json({error:e.message})}});
// ---- admin
app.post('/api/login',rate({windowMs:15*60e3,max:10,message:{error:'Muitas tentativas. Aguarde 15 minutos.'}}),(q,s)=>{
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(q.body.email||'').toLowerCase());
 if(!u||!bcrypt.compareSync(String(q.body.password||''),u.hash))return s.status(401).json({error:'Credenciais inválidas'});
 q.session.regenerate(()=>{q.session.uid=u.id;q.session.email=u.email;s.json({ok:1})})});
app.post('/api/logout',(q,s)=>q.session.destroy(()=>s.json({ok:1})));
app.get('/api/admin/me',A,(q,s)=>s.json({email:q.session.email}));
app.get('/api/admin/dashboard',A,(q,s)=>{const n=x=>db.prepare(x).get().n;s.json({products:n('SELECT COUNT(*) n FROM products'),active:n('SELECT COUNT(*) n FROM products WHERE active=1'),low:n('SELECT COUNT(*) n FROM products WHERE active=1 AND stock<=min_stock'),orders:n('SELECT COUNT(*) n FROM orders'),waiting:n("SELECT COUNT(*) n FROM orders WHERE status='aguardando_atendimento'"),done:n("SELECT COUNT(*) n FROM orders WHERE status='concluido'"),revenue30:n("SELECT COALESCE(SUM(total_cents),0) n FROM orders WHERE status!='cancelado' AND created_at>=datetime('now','-30 day')"),top:db.prepare("SELECT oi.name,SUM(oi.qty) q,SUM(oi.qty*oi.unit_cents) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status!='cancelado' GROUP BY oi.product_id ORDER BY q DESC LIMIT 10").all(),sales:db.prepare("SELECT COUNT(DISTINCT o.id) orders,SUM(oi.qty) units,COALESCE(SUM(oi.qty*oi.unit_cents),0) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status!='cancelado' AND o.created_at>=datetime('now','-30 day')").get()})});
const upl=multer({storage:multer.diskStorage({destination:up,filename:(q,f,cb)=>cb(null,crypto.randomBytes(12).toString('hex')+({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'})[f.mimetype])}),limits:{fileSize:(+process.env.MAX_UPLOAD_MB||3)*1048576},fileFilter:(q,f,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(f.mimetype))});
const rm=f=>{if(f)fs.unlink(path.join(__dirname,'public',f),()=>{})};
app.get('/api/admin/products',A,(q,s)=>s.json(db.prepare('SELECT p.*,c.name category FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.name').all()));
const saveP=(q,s)=>{const b=q.body,name=String(b.name||'').trim(),price=cents(b.price),promo=cents(b.promo),cost=cents(b.cost),stock=int(b.stock||0),min=int(b.min_stock||0),img=q.files?.image?.[0]?'/uploads/'+q.files.image[0].filename:null,img2=q.files?.image2?.[0]?'/uploads/'+q.files.image2[0].filename:null,featured=b.featured==='1'?1:0;
 if(!name||price==null||[price,promo,cost,stock,min].some(Number.isNaN)||(promo!=null&&promo>price)){if(img)rm(img);if(img2)rm(img2);return s.status(400).json({error:'Dados inválidos: confira nome, preços (promoção ≤ preço) e quantidades.'})}
 const sku=String(b.sku||'').trim()||null,cat=int(b.category_id)||null,act=b.active==='1'?1:0,desc=String(b.description||'').slice(0,2000);
 try{if(q.params.id){const o=db.prepare('SELECT image,image2 FROM products WHERE id=?').get(q.params.id);if(!o){rm(img);rm(img2);return s.status(404).json({error:'Produto não encontrado'})}
   db.prepare('UPDATE products SET sku=?,name=?,description=?,category_id=?,cost_cents=?,price_cents=?,promo_cents=?,min_stock=?,active=?,featured=?,image=COALESCE(?,image),image2=COALESCE(?,image2),updated_at=CURRENT_TIMESTAMP WHERE id=?').run(sku,name,desc,cat,cost,price,promo,min,act,featured,img,img2,q.params.id);if(img)rm(o.image);if(img2)rm(o.image2)}
  else db.transaction(()=>{const id=db.prepare('INSERT INTO products(sku,name,description,category_id,cost_cents,price_cents,promo_cents,stock,min_stock,active,image,image2,featured) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(sku,name,desc,cat,cost,price,promo,stock,min,act,img,img2,featured).lastInsertRowid;if(stock)db.prepare('INSERT INTO stock_moves(product_id,delta,reason,user_email) VALUES(?,?,?,?)').run(id,stock,'Estoque inicial',q.session.email)})();
  s.json({ok:1})}catch(e){rm(img);rm(img2);s.status(/UNIQUE/.test(e.message)?409:500).json({error:/UNIQUE/.test(e.message)?'SKU já existe.':'Erro ao salvar.'})}};
const productUploads=upl.fields([{name:'image',maxCount:1},{name:'image2',maxCount:1}]);app.post('/api/admin/products',A,productUploads,saveP);app.put('/api/admin/products/:id',A,productUploads,saveP);
app.post('/api/admin/products/:id/stock',A,(q,s)=>{const d=Number(q.body.delta),why=String(q.body.reason||'').trim();if(!Number.isInteger(d)||!d||!why)return s.status(400).json({error:'Informe quantidade e motivo.'});
 try{db.transaction(()=>{if(db.prepare('UPDATE products SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock+?>=0').run(d,q.params.id,d).changes!==1)throw 0;db.prepare('INSERT INTO stock_moves(product_id,delta,reason,user_email) VALUES(?,?,?,?)').run(q.params.id,d,why,q.session.email)})();s.json({ok:1})}catch{s.status(409).json({error:'Ajuste inválido (estoque ficaria negativo).'})}});
app.get('/api/admin/orders',A,(q,s)=>{const t='%'+String(q.query.q||'')+'%';const os=db.prepare('SELECT * FROM orders WHERE code LIKE ? OR customer_name LIKE ? ORDER BY id DESC LIMIT 200').all(t,t);const it=db.prepare('SELECT * FROM order_items WHERE order_id=?');s.json(os.map(o=>({...o,items:it.all(o.id)})))});
app.put('/api/admin/orders/:id',A,(q,s)=>{const st=q.body.status;if(!ST.includes(st))return s.status(400).json({error:'Status inválido'});
 db.transaction(()=>{const o=db.prepare('SELECT * FROM orders WHERE id=?').get(q.params.id);if(!o)return;
  if(st==='cancelado'&&o.status!=='cancelado')for(const i of db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id)){db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(i.qty,i.product_id);db.prepare('INSERT INTO stock_moves(product_id,delta,reason,order_id,user_email) VALUES(?,?,?,?,?)').run(i.product_id,i.qty,'Cancelamento '+o.code,o.id,q.session.email)}
  if(o.status==='cancelado'&&st!=='cancelado')throw new Error('Pedido cancelado não pode ser reaberto.');
  db.prepare('UPDATE orders SET status=?,notes=COALESCE(?,notes) WHERE id=?').run(st,q.body.notes??null,o.id)})();s.json({ok:1})});
app.put('/api/admin/settings',A,(q,s)=>{const k=['whatsapp','instagram','hours','address','address2','about'];db.transaction(()=>k.forEach(x=>{if(typeof q.body[x]==='string')db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(x,q.body[x].slice(0,2000))}))();s.json({ok:1})});
app.use((e,q,s,n)=>{console.error(e.message);s.status(e.message==='Pedido cancelado não pode ser reaberto.'?409:500).json({error:e.message==='Pedido cancelado não pode ser reaberto.'?e.message:'Erro interno'})});
app.listen(process.env.PORT||3000,()=>console.log('Mania de Aromas em http://localhost:'+(process.env.PORT||3000)));

/* app.js - simple front-end admin functionality using localStorage
   Works across all pages: index.html, products.html, media.html, orders.html, users.html, login.html, settings.html
*/

/* -----------------------
   Helpers: storage + utils
   ----------------------- */
const DB = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)) || []; }catch(e){ return []; } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); },
  remove(k){ localStorage.removeItem(k); }
};

const uid = (prefix='id')=> prefix + '_' + Math.random().toString(36).slice(2,9);

/* seed sample data if empty */
if(!localStorage.getItem('products')) {
  DB.set('products', [
    { id: uid('p'), title: 'Dental Mirror', category: 'Instruments', price: 25.99, stock: 45, media: [], featured:false },
    { id: uid('p'), title: 'Nitrile Gloves', category: 'Supplies', price: 12.5, stock: 120, media: [], featured:false }
  ]);
}
if(!localStorage.getItem('orders')) {
  DB.set('orders', [
    { id: uid('o'), customer: 'Dr. Sarah Johnson', date: '2025-11-23', items:3, total:245, status:'Pending' }
  ]);
}
if(!localStorage.getItem('users')) {
  DB.set('users', [{ id: uid('u'), name:'Admin User', email:'admin@dentex.com', role:'admin' }]);
}
if(!localStorage.getItem('media')) {
  DB.set('media', []);
}

/* simple session for login */
function auth() {
  return !!localStorage.getItem('session');
}

/* redirect to login if needed (call in pages that require auth) */
function requireAuth() {
  if(!auth()) {
    window.location.href = 'login.html';
  }
}

/* Format currency */
function price(v){ return '$'+ Number(v).toFixed(2); }

/* -----------------------
   NAV UI (common)
   ----------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(a=>{
    if(a.getAttribute('href') === location.pathname.split('/').pop() || (a.getAttribute('href')==='index.html' && location.pathname.endsWith('/'))) {
      a.classList.add('active');
    }
  });
});

/* -----------------------
   LOGIN (login.html)
   ----------------------- */
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = form.email.value.trim();
    const pass = form.password.value.trim();
    // simple check - replace with API later
    if((email === 'admin@barakah.com' && pass === 'admin123') || DB.get('users').some(u=>u.email === email)) {
      localStorage.setItem('session', JSON.stringify({ email }));
      window.location.href = 'index.html';
    } else {
      alert('Invalid credentials. Try admin@barakah.com / admin123');
    }
  });
}

/* -----------------------
   DASHBOARD (index.html)
   ----------------------- */
function initDashboard() {
  requireAuth();
  const products = DB.get('products');
  const orders = DB.get('orders');
  const users = DB.get('users');
  document.getElementById('k-products').textContent = products.length;
  document.getElementById('k-orders').textContent = orders.length;
  document.getElementById('k-users').textContent = users.length;
  // recent orders list
  const tbody = document.getElementById('recentOrdersBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  if(orders.length===0){
    tbody.innerHTML = '<tr><td colspan="4" class="small">No orders yet</td></tr>';
  } else {
    orders.slice(0,6).forEach(o=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${o.id}</td><td>${o.customer}</td><td>${o.date}</td><td>${o.status}</td>`;
      tbody.appendChild(tr);
    });
  }
}

/* -----------------------
   PRODUCTS (products.html)
   ----------------------- */
function renderProductsList() {
  requireAuth();
  const products = DB.get('products');
  const list = document.getElementById('productsList');
  const empty = document.getElementById('productsEmpty');
  if(!list) return;
  list.innerHTML = '';
  if(products.length===0) {
    empty.style.display='block';
    return;
  } else empty.style.display='none';
  products.forEach(p=>{
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.id}</td>
      <td><strong>${p.title}</strong><div class="small">${p.category}</div></td>
      <td>${price(p.price)}</td>
      <td>${p.stock}</td>
      <td>
        <button class="btn btn-ghost" onclick="openEditProduct('${p.id}')">Edit</button>
        <button class="btn btn-ghost" onclick="removeProduct('${p.id}')">Delete</button>
      </td>`;
    list.appendChild(row);
  });
}

function openEditProduct(id){
  const products = DB.get('products');
  const p = products.find(x=>x.id===id);
  if(!p) return alert('Product not found');
  // populate form
  const form = document.getElementById('productForm');
  form.dataset.editId = id;
  form.title.value = p.title;
  form.category.value = p.category;
  form.price.value = p.price;
  form.stock.value = p.stock;
  form.description.value = p.description || '';
  // media preview
  renderMediaPreview(p.media || [], 'productMediaPreview');
  // show editor panel
  document.getElementById('productFormPanel').scrollIntoView({behavior:'smooth'});
}

function removeProduct(id){
  if(!confirm('Delete product?')) return;
  const products = DB.get('products').filter(p=>p.id!==id);
  DB.set('products', products);
  renderProductsList();
  alert('Deleted');
}

/* handle add/edit product form (supports multiple media) */
function initProductForm(){
  const form = document.getElementById('productForm');
  if(!form) return;
  const inputFiles = document.getElementById('productMedia');
  const previewId = 'productMediaPreview';
  let stagedMedia = []; // array of {id, type, dataUrl, name}
  // handle files
  inputFiles.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files);
    for(const f of files){
      const isVideo = f.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = (ev)=>{
        stagedMedia.push({ id: uid('m'), type: isVideo? 'video':'image', data: ev.target.result, name: f.name });
        renderMediaPreview(stagedMedia, previewId);
      };
      reader.readAsDataURL(f);
    }
    inputFiles.value=''; // reset
  });

  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const data = DB.get('products');
    const editId = form.dataset.editId;
    const payload = {
      id: editId || uid('p'),
      title: form.title.value.trim() || 'Untitled',
      category: form.category.value || 'General',
      price: Number(form.price.value) || 0,
      stock: Number(form.stock.value) || 0,
      description: form.description.value || '',
      featured: !!form.featured.checked,
      media: []
    };

    // save staged media into global 'media' store and attach ids to product
    const globalMedia = DB.get('media');
    stagedMedia.forEach(m=>{
      globalMedia.push(m);
      payload.media.push(m.id);
    });
    DB.set('media', globalMedia);

    if(editId){
      const idx = data.findIndex(x=>x.id===editId);
      if(idx>-1) data[idx] = Object.assign(data[idx], payload);
    } else {
      data.unshift(payload);
    }
    DB.set('products', data);
    stagedMedia = [];
    renderProductsList();
    form.reset();
    document.getElementById('productMediaPreview').innerHTML='';
    alert('Saved product');
  });
}

/* render thumbnails for product editor */
function renderMediaPreview(arr, containerId){
  const cont = document.getElementById(containerId);
  if(!cont) return;
  cont.innerHTML = '';
  if(!arr || arr.length===0) { cont.innerHTML='<div class="small">No media</div>'; return; }
  arr.forEach(m=>{
    const div = document.createElement('div');
    div.className='media-item';
    div.innerHTML = (m.type==='image') ? `<img src="${m.data}" alt="${m.name}"><div class="meta">${m.name}</div>` : `<video src="${m.data}" controls></video><div class="meta">${m.name}</div>`;
    cont.appendChild(div);
  });
}

/* called on products page load */
function initProductsPage(){
  requireAuth();
  renderProductsList();
  initProductForm();
  // show empty panel if no products
  const products = DB.get('products');
  document.getElementById('productsEmpty').style.display = products.length ? 'none' : 'block';
}

/* -----------------------
   MEDIA manager (media.html)
   ----------------------- */
function renderMediaGallery(){
  requireAuth();
  const gallery = document.getElementById('mediaGallery');
  const media = DB.get('media');
  gallery.innerHTML='';
  if(media.length===0) {
    gallery.innerHTML = `<div class="empty">No media uploaded. Upload from Products page or here.</div>`;
    return;
  }
  media.forEach(m=>{
    const div = document.createElement('div');
    div.className='media-item';
    div.innerHTML = (m.type==='image') ? `<img src="${m.data}">` : `<video src="${m.data}" controls></video>`;
    const del = document.createElement('button'); del.textContent='Remove'; del.className='btn btn-ghost'; del.style.marginTop='8px';
    del.addEventListener('click', ()=>{
      if(!confirm('Remove this media?')) return;
      const remaining = DB.get('media').filter(x=>x.id!==m.id);
      DB.set('media', remaining);
      // also remove references from products
      const products = DB.get('products').map(p=>{
        p.media = (p.media||[]).filter(id=>id!==m.id);
        return p;
      });
      DB.set('products', products);
      renderMediaGallery();
    });
    div.appendChild(del);
    gallery.appendChild(div);
  });
}

/* initialize upload on media manager page */
function initMediaPage(){
  requireAuth();
  const input = document.getElementById('mediaUpload');
  if(input){
    input.addEventListener('change', (e)=>{
      const files = Array.from(e.target.files);
      const arr = DB.get('media');
      files.forEach(f=>{
        const reader = new FileReader();
        reader.onload = ev=>{
          arr.unshift({ id: uid('m'), type: f.type.startsWith('video')?'video':'image', data: ev.target.result, name: f.name });
          DB.set('media', arr);
          renderMediaGallery();
        };
        reader.readAsDataURL(f);
      });
      input.value='';
    });
  }
  renderMediaGallery();
}

/* -----------------------
   ORDERS (orders.html)
   ----------------------- */
function initOrdersPage(){
  requireAuth();
  const tbody = document.getElementById('ordersList');
  const orders = DB.get('orders');
  tbody.innerHTML='';
  if(orders.length===0) { tbody.innerHTML = '<tr><td colspan="4" class="small">No orders</td></tr>'; return; }
  orders.forEach(o=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${o.id}</td><td>${o.customer}</td><td>${o.date}</td><td>
      <select onchange="updateOrderStatus('${o.id}', this.value)">
        <option ${o.status==='Pending'?'selected':''}>Pending</option>
        <option ${o.status==='Processing'?'selected':''}>Processing</option>
        <option ${o.status==='Completed'?'selected':''}>Completed</option>
      </select>
    </td>`;
    tbody.appendChild(tr);
  });
}

function updateOrderStatus(id, status){
  const orders = DB.get('orders').map(o=> o.id===id ? ({...o, status}) : o);
  DB.set('orders', orders);
  initOrdersPage();
}

/* -----------------------
   USERS (users.html)
   ----------------------- */
function initUsersPage(){
  requireAuth();
  const tbody = document.getElementById('usersList');
  tbody.innerHTML='';
  const users = DB.get('users');
  if(users.length===0){ tbody.innerHTML = '<tr><td colspan="4" class="small">No users</td></tr>'; return; }
  users.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>
      <select onchange="changeUserRole('${u.id}', this.value)">
        <option ${u.role==='admin'?'selected':''}>admin</option>
        <option ${u.role==='editor'?'selected':''}>editor</option>
        <option ${u.role==='customer'?'selected':''}>customer</option>
      </select>
    </td>`;
    tbody.appendChild(tr);
  });
}

function changeUserRole(id, role){
  const users = DB.get('users').map(u=> u.id===id?({...u, role}):u);
  DB.set('users', users);
  initUsersPage();
}

/* -----------------------
   SETTINGS
   ----------------------- */
function initSettingsPage(){
  requireAuth();
  const form = document.getElementById('settingsForm');
  if(!form) return;
  const cfg = JSON.parse(localStorage.getItem('siteConfig') || '{}');
  form.siteTitle.value = cfg.siteTitle || 'Dentex Admin';
  form.brandColor.value = cfg.brandColor || '#64a6bd';
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const newCfg = { siteTitle: form.siteTitle.value.trim(), brandColor: form.brandColor.value };
    localStorage.setItem('siteConfig', JSON.stringify(newCfg));
    alert('Saved settings. Reload to apply colors.');
  });
}

/* -----------------------
   LOGOUT
   ----------------------- */
function doLogout(){
  localStorage.removeItem('session');
  window.location.href='../frontend/login.html';
}

/* -----------------------
   Kickoff on every page
   ----------------------- */
window.appInit = function(){
  // call page-specific initializers by ID presence
  initLoginPage();
  if(document.body.classList.contains('page-dashboard')) initDashboard();
  if(document.body.classList.contains('page-products')) initProductsPage();
  if(document.body.classList.contains('page-media')) initMediaPage();
  if(document.body.classList.contains('page-orders')) initOrdersPage();
  if(document.body.classList.contains('page-users')) initUsersPage();
  if(document.body.classList.contains('page-settings')) initSettingsPage();
};

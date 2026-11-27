// Somente leitura: lista categorias e produtos com vínculo inconsistente.
require('dotenv').config();const D=require('better-sqlite3'),path=require('path');
const db=new D(path.resolve(__dirname,'..',process.env.DB_PATH||'data/mania.db'),{readonly:true});
console.table(db.prepare('SELECT c.id,c.name,COUNT(p.id) produtos FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id').all());
console.log('Sem categoria ou categoria inexistente:');console.table(db.prepare('SELECT p.id,p.name,p.category_id FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE c.id IS NULL').all());

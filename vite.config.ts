import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()],server:{fs:{deny:['.env','.env.*','*.{crt,pem,key,p12,pfx,cer,der}','.npmrc','.yarnrc.yml','**/.git/**','**/server/**']}}});

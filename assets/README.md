# 📝 Notas Importantes sobre as Imagens

## ⚠️ ATENÇÃO: Imagens Necessárias

Para que o sistema de autenticação funcione corretamente com o design oficial, você precisa adicionar 2 imagens na pasta `/assets`:

### 1. Logo do OBV
**Nome do arquivo:** `logo-obv.png`  
**Localização:** `/assets/logo-obv.png`  
**Descrição:** Logo/emblema do clã OBV  
**Formato recomendado:** PNG com fundo transparente  
**Tamanho recomendado:** 200x200px ou maior (será redimensionado automaticamente)

### 2. Background do Login
**Nome do arquivo:** `bg-login.jpg`  
**Localização:** `/assets/bg-login.jpg`  
**Descrição:** Imagem de fundo para as páginas de login/cadastro  
**Formato recomendado:** JPG ou PNG  
**Tamanho recomendado:** 1920x1080px ou maior  
**Sugestões:** Imagem relacionada ao Pokémon, tema dark, com boa qualidade

---

## 📂 Como Adicionar as Imagens

1. Crie a pasta `/assets` (se ainda não existir)
2. Adicione os 2 arquivos de imagem:
   - `logo-obv.png`
   - `bg-login.jpg`
3. Certifique-se de que os nomes estão exatamente como especificado

---

## 🔄 Caso Não Tenha as Imagens

Se você não tiver as imagens no momento, o sistema ainda funcionará, mas:

- O logo aparecerá quebrado (ícone de imagem não encontrada)
- O fundo do login será apenas a cor sólida do gradiente

**Alternativas temporárias:**

### Para logo-obv.png:
Você pode usar qualquer logo temporário ou criar um placeholder

### Para bg-login.jpg:
Você pode:
1. Usar uma imagem placeholder
2. Ou remover temporariamente o background alterando em `css/login.css`:

```css
body {
  /* Comentar esta linha: */
  /* background: url("../assets/bg-login.jpg") center / cover no-repeat; */
  
  /* E usar apenas o gradiente: */
  background: linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 100%);
}
```

---

## 🎨 Sugestões de Imagens

### Para bg-login.jpg:
- Busque por "pokemon dark wallpaper" ou "pokemon night background"
- Sites gratuitos: Unsplash, Pexels, Pixabay
- Use imagens com tons escuros/noturnos para combinar com o design

### Para logo-obv.png:
- Crie um logo simples com ferramentas como:
  - Canva (gratuito)
  - Figma (gratuito)
  - Photopea (gratuito, similar ao Photoshop)
- Ou use um gerador de logos online

---

Após adicionar as imagens, o visual ficará completo conforme o design especificado! 🎉

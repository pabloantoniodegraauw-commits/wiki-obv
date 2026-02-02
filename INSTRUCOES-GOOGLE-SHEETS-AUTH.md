# 📊 Configuração do Google Sheets

## Estrutura do Banco de Dados

Este documento descreve a configuração necessária do Google Sheets para o sistema de autenticação do Wiki-OBV.

---

## 🔗 Planilha Utilizada

**ID da Planilha:** `1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ`

**Link:** https://docs.google.com/spreadsheets/d/1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ

---

## 📋 Abas Necessárias

### 1️⃣ Aba: `usuarios`

Esta aba armazena todos os membros cadastrados e suas informações.

#### Estrutura das Colunas:

| Coluna | Nome | Tipo | Descrição |
|--------|------|------|-----------|
| **A** | `email` | Texto | Email do usuário (único) |
| **B** | `nome` | Texto | Nome completo do Google |
| **C** | `foto` | URL | URL da foto do perfil do Google |
| **D** | `nickname` | Texto | Apelido escolhido pelo usuário |
| **E** | `level` | Número | Level do jogador |
| **F** | `tipoCla` | Texto | Tipo do clã (TIME, SPACE, VOID) |
| **G** | `tier` | Número | Tier do clã (1-5) |
| **H** | `status` | Texto | Status da conta: `pendente`, `aprovado`, `rejeitado` |
| **I** | `role` | Texto | Cargo: `membro` ou `admin` |
| **J** | `dataCadastro` | Data/Hora | Data e hora do cadastro |

#### Exemplo de Dados:

```
email                    | nome           | foto                | nickname  | level | tipoCla | tier | status   | role   | dataCadastro
usuario@gmail.com        | João Silva     | https://...jpg      | JoaoS     | 100   | TIME    | 3    | aprovado | membro | 2026-02-02 10:00
admin@gmail.com          | Maria Admin    | https://...jpg      | Admin1    | 150   | SPACE   | 5    | aprovado | admin  | 2026-01-15 08:30
pendente@gmail.com       | Pedro Santos   | https://...jpg      | PedroX    | 50    | VOID    | 2    | pendente | membro | 2026-02-01 15:20
```

#### ✅ Regras Importantes:

- **Email** deve ser único (não pode ter duplicados)
- **Status** só aceita: `pendente`, `aprovado`, `rejeitado`
- **Role** só aceita: `membro`, `admin`
- **TipoCla** só aceita: `TIME`, `SPACE`, `VOID`
- **Tier** deve ser um número de 1 a 5
- Sempre deve haver **pelo menos 1 admin** no sistema

---

### 2️⃣ Aba: `logs`

Esta aba registra todos os eventos de login, atividade e logout dos usuários.

#### Estrutura das Colunas:

| Coluna | Nome | Tipo | Descrição |
|--------|------|------|-----------|
| **A** | `email` | Texto | Email do usuário |
| **B** | `nickname` | Texto | Nickname do usuário |
| **C** | `evento` | Texto | Tipo de evento: `login`, `ping`, `logout` |
| **D** | `dataHora` | Data/Hora | Data e hora do evento |

#### Exemplo de Dados:

```
email                | nickname | evento | dataHora
usuario@gmail.com    | JoaoS    | login  | 2026-02-02 10:00:00
usuario@gmail.com    | JoaoS    | ping   | 2026-02-02 10:05:00
usuario@gmail.com    | JoaoS    | ping   | 2026-02-02 10:10:00
usuario@gmail.com    | JoaoS    | logout | 2026-02-02 10:15:00
admin@gmail.com      | Admin1   | login  | 2026-02-02 09:30:00
```

#### ✅ Regras Importantes:

- **Evento** só aceita: `login`, `ping`, `logout`
- **login**: registrado quando o usuário faz login
- **ping**: registrado automaticamente a cada 5 minutos enquanto o usuário está ativo
- **logout**: registrado quando o usuário sai ou fecha a página
- O tempo online é calculado pela diferença entre `login` e o último `ping` ou `logout`

---

## 🔧 Como Criar as Abas

### Opção 1: Criação Manual

1. Abra sua planilha do Google Sheets
2. Crie uma nova aba chamada **`usuarios`**
3. Na linha 1, adicione os cabeçalhos:
   ```
   email | nome | foto | nickname | level | tipoCla | tier | status | role | dataCadastro
   ```
4. Crie outra aba chamada **`logs`**
5. Na linha 1, adicione os cabeçalhos:
   ```
   email | nickname | evento | dataHora
   ```

### Opção 2: Criação Automática

As abas serão criadas automaticamente quando o Google Apps Script for executado pela primeira vez. O script detecta se as abas existem e cria com os cabeçalhos corretos.

---

## 👤 Criando o Primeiro Admin

**IMPORTANTE:** Para o sistema funcionar, você precisa criar manualmente o primeiro administrador.

1. Abra a aba `usuarios`
2. Adicione uma linha com seus dados:
   ```
   seu-email@gmail.com | Seu Nome | URL_da_foto | SeuNick | 1 | TIME | 1 | aprovado | admin | [data atual]
   ```

**Exemplo:**
```
admin@gmail.com | Admin Teste | https://lh3.googleusercontent.com/a/default-user | AdminOBV | 1 | TIME | 1 | aprovado | admin | 2026-02-02 10:00:00
```

---

## 🔒 Segurança e Permissões

### Permissões da Planilha

- Mantenha a planilha **privada**
- Apenas o **Google Apps Script** precisa ter acesso
- Não compartilhe o link da planilha publicamente

### Permissões do Apps Script

O Apps Script precisa ter permissão para:
- ✅ Ver e gerenciar suas planilhas do Google Drive
- ✅ Conectar-se a um serviço externo (para receber requisições do site)

Essas permissões serão solicitadas na primeira vez que você implantar o script.

---

## 📊 Visualização Recomendada

### Formatação Sugerida

Para facilitar a visualização, você pode aplicar formatação condicional:

#### Na aba `usuarios`:

- **Status = pendente**: fundo amarelo
- **Status = aprovado**: fundo verde claro
- **Status = rejeitado**: fundo vermelho claro
- **Role = admin**: texto em negrito e dourado

#### Na aba `logs`:

- **Evento = login**: fundo azul claro
- **Evento = logout**: fundo laranja claro
- **Evento = ping**: sem formatação

---

## 🔄 Backup Automático

Recomendamos configurar backup automático da planilha:

1. Vá em **Arquivo** > **Histórico de versões** > **Ver histórico de versões**
2. O Google Sheets salva automaticamente todas as alterações
3. Você pode restaurar versões anteriores a qualquer momento

---

## 🐛 Solução de Problemas

### Problema: "Erro ao conectar com o banco de dados"

**Solução:**
1. Verifique se as abas `usuarios` e `logs` existem
2. Confirme que os nomes das abas estão corretos (sem espaços extras)
3. Verifique se o ID da planilha no Apps Script está correto

### Problema: "Usuário não encontrado após cadastro"

**Solução:**
1. Abra a aba `usuarios`
2. Verifique se o email foi cadastrado corretamente
3. Confirme que não há espaços antes ou depois do email
4. Verifique se o status está como `pendente`

### Problema: "Logs não aparecem"

**Solução:**
1. Verifique se a aba `logs` existe
2. Confirme que o Apps Script tem permissão de escrita
3. Teste fazer um novo login para verificar se o log é criado

---

## 📞 Suporte

Para dúvidas ou problemas relacionados à configuração do Google Sheets, verifique:

1. ✅ Todas as abas estão criadas
2. ✅ Os cabeçalhos estão corretos
3. ✅ Existe pelo menos 1 admin cadastrado
4. ✅ O Apps Script está implantado corretamente

---

**Última atualização:** 02 de fevereiro de 2026

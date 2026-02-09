import csv
import os
import requests
import re

# Pasta onde os assets serão salvos
PASTA = "assets"
os.makedirs(PASTA, exist_ok=True)

# Função para limpar nomes de arquivos
def limpar_nome(nome):
    # Remove caracteres inválidos para nomes de arquivo
    return re.sub(r'[\\/*?:"<>|]', "_", nome)

# Abrir CSV
with open("assets.csv", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f, delimiter=';')  # ← importante: separador correto
    
    # Mostrar as colunas detectadas
    print("Colunas detectadas no CSV:", reader.fieldnames)
    
    # Detectar automaticamente a coluna de imagens
    coluna_imagem = None
    coluna_nome = None
    for col in reader.fieldnames:
        if "imagem" in col.lower() or "link" in col.lower():
            coluna_imagem = col
        if "nome" in col.lower():
            coluna_nome = col
    
    if not coluna_imagem:
        raise Exception("Não foi encontrada a coluna de links/imagens no CSV.")
    if not coluna_nome:
        raise Exception("Não foi encontrada a coluna de nomes no CSV.")

    # Loop para baixar cada imagem
    for row in reader:
        url = row[coluna_imagem].strip()
        nome = row[coluna_nome].strip()
        if not url:
            continue

        nome_arquivo = limpar_nome(nome) + os.path.splitext(url)[1]  # manter extensão original
        caminho = os.path.join(PASTA, nome_arquivo)

        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200:
                with open(caminho, "wb") as img:
                    img.write(r.content)
                print(f"✔ Baixado: {nome_arquivo}")
            else:
                print(f"✖ Erro {r.status_code}: {url}")
        except Exception as e:
            print(f"⚠ Falha: {url} | {e}")

import csv
import os
import requests

# cria pasta de destino
os.makedirs("imagens_baixadas", exist_ok=True)

with open("itens_imagens.csv", newline="", encoding="utf-8") as arquivo:
    leitor = csv.DictReader(arquivo)

    for linha in leitor:
        nome = linha["nome"].strip()
        url = linha["url"].strip()

        # limpa nome inválido para Windows
        nome_limpo = "".join(c for c in nome if c not in r'\/:*?"<>|')
        nome_limpo = nome_limpo.replace(" ", "_")

        try:
            resposta = requests.get(url)
            resposta.raise_for_status()

            # detecta extensão automaticamente
            ext = url.split(".")[-1].split("?")[0]

            caminho = os.path.join("imagens_baixadas", f"{nome_limpo}.{ext}")

            with open(caminho, "wb") as f:
                f.write(resposta.content)

            print(f"✔ Baixado: {nome_limpo}.{ext}")

        except Exception as e:
            print(f"❌ Erro ao baixar {nome}: {e}")

print("\n🏁 Processo finalizado")

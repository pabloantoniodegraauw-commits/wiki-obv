"""
Script para baixar sprites SHINY em pixel art de alta qualidade.
Substitui os sprites shiny atuais (256x256 baixa qualidade) por pixel art (120x120).

Estratégia de download (fallback):
  1. Pokémon Showdown Dex (120x120px) - melhor qualidade, combina com sprites normais
  2. PokeAPI front_shiny (96x96px) - fallback para pokémon não encontrados no Showdown

Uso: python baixar_shinys_pokeapi.py
"""

import os
import re
import time
import requests

# ==================== CONFIGURAÇÃO ====================
PASTA_SPRITES = os.path.join(os.path.dirname(__file__), "..", "imagens-pokemon", "sprite-pokemon")
LOG_FILE = os.path.join(os.path.dirname(__file__), "log_shinys.txt")
DELAY = 0.15  # segundos entre requests (evitar rate limit)

# URL base do Showdown Dex sprites
SHOWDOWN_BASE = "https://play.pokemonshowdown.com/sprites/dex-shiny"

# ==================== MAPEAMENTO POKEAPI (para fallback) ====================
# Pokémon com formas que a PokeAPI precisa de slug específico
MAPEAMENTO_POKEAPI = {
    "Deoxys": "deoxys-normal",
    "Wormadam": "wormadam-plant",
    "Giratina": "giratina-altered",
    "Shaymin": "shaymin-land",
    "Basculin": "basculin-red-striped",
    "Darmanitan": "darmanitan-standard",
    "Tornadus": "tornadus-incarnate",
    "Thundurus": "thundurus-incarnate",
    "Landorus": "landorus-incarnate",
    "Keldeo": "keldeo-ordinary",
    "Meloetta": "meloetta-aria",
    "Aegislash": "aegislash-shield",
    "Pumpkaboo": "pumpkaboo-average",
    "Gourgeist": "gourgeist-average",
    "Zygarde": "zygarde-50",
    "Oricorio": "oricorio-baile",
    "Lycanroc": "lycanroc-midday",
    "Wishiwashi": "wishiwashi-solo",
    "Minior": "minior-red-meteor",
    "Mimikyu": "mimikyu-disguised",
    "Toxtricity": "toxtricity-amped",
    "Eiscue": "eiscue-ice",
    "Indeedee": "indeedee-male",
    "Morpeko": "morpeko-full-belly",
    "Urshifu": "urshifu-single-strike",
    "Basculegion": "basculegion-male",
    "Enamorus": "enamorus-incarnate",
    "Squawkabilly": "squawkabilly-green-plumage",
    "Oinkologne": "oinkologne-male",
    "Maushold": "maushold-family-of-four",
    "Tatsugiri": "tatsugiri-curly",
    "Dudunsparce": "dudunsparce-two-segment",
    "Bloodmoon Ursaluna": "ursaluna-bloodmoon",
}


def extrair_nome_pokemon(nome_arquivo):
    """Extrai o nome do Pokémon do nome do arquivo shiny."""
    match = re.match(r'^(.+?)-Shiny-', nome_arquivo)
    if match:
        return match.group(1)
    return None


def nome_para_slug_showdown(nome):
    """Converte nome para slug do Showdown: lowercase, remove TUDO que não é letra/número."""
    slug = nome.lower()
    slug = re.sub(r"[^a-z0-9]", "", slug)
    return slug


def nome_para_slug_pokeapi(nome):
    """Converte nome para slug da PokeAPI."""
    if nome in MAPEAMENTO_POKEAPI:
        return MAPEAMENTO_POKEAPI[nome]
    slug = nome.lower().strip()
    slug = slug.replace("♀", "-f").replace("♂", "-m")
    slug = slug.replace("'", "").replace(".", "").replace(":", "")
    slug = slug.replace(" ", "-")
    return slug


def tentar_baixar_showdown(nome_pokemon):
    """Tenta baixar sprite shiny do Showdown Dex (120x120px)."""
    slug = nome_para_slug_showdown(nome_pokemon)
    url = f"{SHOWDOWN_BASE}/{slug}.png"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200 and len(resp.content) > 100:
            return resp.content, f"Showdown ({slug}) - {len(resp.content)} bytes"
    except:
        pass
    return None, None


def tentar_baixar_pokeapi(nome_pokemon):
    """Tenta baixar sprite shiny da PokeAPI (96x96px) como fallback."""
    slug = nome_para_slug_pokeapi(nome_pokemon)
    
    try:
        # Buscar dados do Pokémon
        url_api = f"https://pokeapi.co/api/v2/pokemon/{slug}"
        resp = requests.get(url_api, timeout=15)
        
        if resp.status_code != 200:
            # Tentar slug simplificado
            slug_simple = re.sub(r"[^a-z0-9-]", "", nome_pokemon.lower().replace(" ", "-"))
            if slug_simple != slug:
                url_api = f"https://pokeapi.co/api/v2/pokemon/{slug_simple}"
                resp = requests.get(url_api, timeout=15)
        
        if resp.status_code != 200:
            return None, f"PokeAPI 404 para '{slug}'"
        
        dados = resp.json()
        sprite_url = dados.get("sprites", {}).get("front_shiny")
        
        if not sprite_url:
            return None, "PokeAPI: sem sprite shiny"
        
        img_resp = requests.get(sprite_url, timeout=15)
        if img_resp.status_code == 200 and len(img_resp.content) > 100:
            return img_resp.content, f"PokeAPI ({slug}) - {len(img_resp.content)} bytes"
        
        return None, f"PokeAPI: falha ao baixar imagem"
        
    except requests.exceptions.Timeout:
        return None, "PokeAPI: timeout"
    except Exception as e:
        return None, f"PokeAPI: {str(e)}"


def baixar_sprite_shiny(nome_pokemon, nome_arquivo, pasta_destino):
    """Baixa sprite shiny com fallback: Showdown Dex → PokeAPI."""
    
    # 1. Tentar Showdown Dex (120x120px, melhor qualidade)
    dados_img, detalhe = tentar_baixar_showdown(nome_pokemon)
    
    # 2. Fallback: PokeAPI (96x96px)
    if dados_img is None:
        time.sleep(DELAY)  # delay extra para PokeAPI
        dados_img, detalhe = tentar_baixar_pokeapi(nome_pokemon)
    
    if dados_img is None:
        return (nome_pokemon, False, detalhe or "Nenhuma fonte disponível")
    
    # Salvar sprite
    caminho_destino = os.path.join(pasta_destino, nome_arquivo)
    with open(caminho_destino, "wb") as f:
        f.write(dados_img)
    
    return (nome_pokemon, True, detalhe)


def main():
    pasta = os.path.abspath(PASTA_SPRITES)
    print(f"Pasta dos sprites: {pasta}")
    print()
    
    if not os.path.exists(pasta):
        print("Pasta de sprites nao encontrada!")
        return
    
    # Listar todos os arquivos shiny
    arquivos_shiny = [f for f in os.listdir(pasta) if "-Shiny-" in f and f.endswith(".png")]
    total = len(arquivos_shiny)
    print(f"Encontrados {total} sprites shiny para atualizar")
    print(f"{'='*60}")
    print()
    
    sucesso_showdown = 0
    sucesso_pokeapi = 0
    falhas = []
    log_entries = []
    
    for i, nome_arquivo in enumerate(sorted(arquivos_shiny), 1):
        nome_pokemon = extrair_nome_pokemon(nome_arquivo)
        if not nome_pokemon:
            msg = f"[{i}/{total}] Nao extraiu nome de: {nome_arquivo}"
            print(msg)
            falhas.append((nome_arquivo, "Nome nao extraido"))
            log_entries.append(msg)
            continue
        
        # Delay entre requests
        if i > 1:
            time.sleep(DELAY)
        
        nome_poke, ok, detalhe = baixar_sprite_shiny(nome_pokemon, nome_arquivo, pasta)
        
        if ok:
            if "Showdown" in detalhe:
                sucesso_showdown += 1
            else:
                sucesso_pokeapi += 1
            msg = f"OK  [{i}/{total}] {nome_pokemon} - {detalhe}"
        else:
            falhas.append((nome_pokemon, detalhe))
            msg = f"ERR [{i}/{total}] {nome_pokemon} - {detalhe}"
        
        print(msg)
        log_entries.append(msg)
        
        # Progresso a cada 100
        if i % 100 == 0:
            total_ok = sucesso_showdown + sucesso_pokeapi
            print(f"\n  Progresso: {i}/{total} | OK: {total_ok} (Showdown: {sucesso_showdown}, PokeAPI: {sucesso_pokeapi}) | Falhas: {len(falhas)}\n")
    
    # Resumo final
    total_ok = sucesso_showdown + sucesso_pokeapi
    print()
    print(f"{'='*60}")
    print(f"RESUMO FINAL")
    print(f"  Total processados: {total}")
    print(f"  Sucesso (Showdown 120x120): {sucesso_showdown}")
    print(f"  Sucesso (PokeAPI 96x96):    {sucesso_pokeapi}")
    print(f"  Total sucesso:              {total_ok}")
    print(f"  Falhas:                     {len(falhas)}")
    
    if falhas:
        print(f"\nLista de falhas:")
        for nome, detalhe in falhas:
            print(f"  - {nome}: {detalhe}")
    
    # Salvar log
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"Log de download de sprites shiny\n")
        f.write(f"Total: {total} | Showdown: {sucesso_showdown} | PokeAPI: {sucesso_pokeapi} | Falhas: {len(falhas)}\n")
        f.write(f"{'='*60}\n\n")
        for entry in log_entries:
            f.write(entry + "\n")
        if falhas:
            f.write(f"\n\nFALHAS:\n")
            for nome, detalhe in falhas:
                f.write(f"  {nome}: {detalhe}\n")
    
    print(f"\nLog salvo em: {LOG_FILE}")


if __name__ == "__main__":
    main()

# 🤝 Cómo trabajar en Connect · Entradas

Guía rápida para colaborar entre varios sin pisarnos el trabajo.
Este proyecto vive en GitHub: <https://github.com/SilentBlur/connect-entradas>

---

## 🧰 Qué necesitás instalado (una sola vez)

- **Git** → <https://git-scm.com/download/win> (en Windows). En Mac ya suele venir.
- **Python** (para levantar la app en tu PC) → <https://www.python.org/downloads/>

Configurá tu nombre en git la primera vez (lo que aparecerá en cada cambio):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

---

## 1. Bajar el proyecto (solo la primera vez)

```bash
git clone https://github.com/SilentBlur/connect-entradas.git
cd connect-entradas
```

---

## 2. Verlo funcionando en tu PC

La app no necesita instalación: es HTML + CSS + JS. Solo hay que servirla.
Parado dentro de la carpeta `connect-entradas`:

```bash
python -m http.server 8770
```

Y abrí en el navegador: <http://localhost:8770>

> Los datos (eventos, entradas, etc.) se guardan en el navegador de cada uno
> (localStorage). **No se comparten** entre PCs — lo que se comparte es el **código**.

---

## 3. El ritmo de trabajo (la regla de oro 🔑)

Para no chocar, seguí SIEMPRE este orden:

```bash
git pull                       # 1. ANTES de empezar: traé lo último del otro
# ... editás los archivos que quieras ...
git add -A                     # 2. marcás tus cambios
git commit -m "qué cambiaste"  # 3. los guardás con una nota corta
git push                       # 4. los subís para que el otro los reciba
```

**Reglas simples:**

- ✅ **Siempre `git pull` antes de arrancar.** Así empezás desde lo más nuevo.
- ✅ Hacé **commits chicos y seguidos**, no uno gigante al final del día.
- ✅ Escribí mensajes claros: `"agrego botón de borrar entradas"`, no `"cambios"`.
- ✅ **Avisale al otro** por chat cuando subís algo importante.

---

## 4. ¿Y si sale un "conflicto"?

Pasa cuando los dos editamos **la misma parte del mismo archivo** a la vez.
Git te lo avisa al hacer `git pull` o `git push`. **No te asustes, no se pierde nada.**

👉 Lo más fácil: **avisá y lo resolvemos juntos** (o le preguntás a Claude). No fuerces
comandos que no entendés (`git reset --hard`, `git push --force`) porque esos sí
pueden borrar trabajo.

---

## 5. Comandos útiles

| Comando | Para qué |
|---|---|
| `git status` | Ver qué cambiaste / en qué estás |
| `git pull` | Traer lo último de GitHub |
| `git log --oneline` | Ver el historial de cambios |
| `git diff` | Ver exactamente qué tocaste antes de commitear |

---

## 🌐 La app online

La versión publicada está en:
**<https://silentblur.github.io/connect-entradas/>**

Se actualiza sola con cada `git push` a la rama `main` (tarda ~1 min).
Esa URL es la que hace que los **QR funcionen desde el celular**.

> En la app → **Configuración → "URL base de los links"** debe estar puesta esa URL,
> para que los QR/links generados apunten a la web pública y no a `localhost`.

---

¿Dudas? Pregúntenle a Claude 🤖 o entre ustedes. ¡A construir! 🚀

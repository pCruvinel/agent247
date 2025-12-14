# Clinical Design System

Especificações visuais e de UX para o "Clinical Design System" da plataforma.

## 1. Filosofia
- **Atmosfera:** "Clean", "Trustworthy", "Calm".
- **Foco:** Clareza, legibilidade e confiança, essencial para a área de saúde.

## 2. Paleta de Cores

### Fundo & Superfícies
- **Página (Background):** `bg-slate-50` (#F8FAFC)
- **Cards/Containers:** `bg-white` (#FFFFFF)
- **Bordas:** `border-slate-100` ou `border-slate-200` (suave)

### Cores Principais
- **Primária (Ações, Headers):** **Blue Royal**
    - Classes: `bg-blue-600`, `text-blue-600`, `hover:bg-blue-700`
- **Secundária/Acentos (Foco, Sucesso, badges):** **Verde Água (Teal)**
    - Classes: `text-teal-500`, `bg-teal-50`, `ring-teal-500`

### Tipografia & Texto
- **Títulos:** `text-slate-800` (Escuro, forte contraste)
- **Corpo:** `text-slate-600` (Leitura confortável)
- **Placeholders/Ícones inativos:** `text-slate-400`

## 3. Componentes

### Cards (Ex: Pacientes, Agendamentos)
- **Container:** `bg-white`, `rounded-xl`, `border border-slate-100`, `shadow-sm`.
- **Interação (Hover):**
    - `hover:shadow-md`
    - `hover:-translate-y-1` (sutil "lift")
    - `transition-all duration-200`
- **Badges:** `bg-blue-100 text-blue-700`

### Forms & Inputs
- **Base:** `border-slate-200`, `rounded-md`.
- **Focus:** `focus:ring-2 focus:ring-teal-500` (Verde Água).
- **Botões de Ação:** `bg-blue-600 hover:bg-blue-700 text-white`.

### Tabelas
- **Header:** `bg-slate-50`, Texto Uppercase pequeno (`text-xs`), `text-slate-500`.
- **Linhas:** Divisores sutis (`border-b border-slate-50`).
- **Zebra striping:** Muito sutil se necessário, preferir fundo branco limpo.

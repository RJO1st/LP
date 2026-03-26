#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# generate_showcase.sh — Beta Showcase: 50 topics per subject, visual-aware
# ═══════════════════════════════════════════════════════════════════════════════
# Run: OPENROUTER_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... ./generate_showcase.sh
# Optional: TARGET_MIN=50 DRY_RUN=1

set -uo pipefail
OPENROUTER_URL="https://openrouter.ai/api/v1/chat/completions"
TARGET_MIN="${TARGET_MIN:-50}"
BATCH_SIZE="${BATCH_SIZE:-8}"
DRY_RUN="${DRY_RUN:-0}"
SUPABASE_REST="${SUPABASE_URL}/rest/v1"

MODELS=(
  "google/gemini-2.5-flash-lite-preview-09-2025"
  "google/gemini-2.0-flash-lite-001"
  "deepseek/deepseek-v3.2"
  "qwen/qwen3-30b-a3b-instruct-2507"
  "openai/gpt-oss-20b"
  "openai/gpt-oss-120b"
  "xiaomi/mimo-v2-flash"
  "meta-llama/llama-3.3-70b-instruct"
  "mistralai/mistral-small-3.1-24b-instruct"
  "arcee-ai/trinity-large-preview:free"
  "google/gemma-3-27b-it:free"
  "qwen/qwen3.5-9b"
  "microsoft/phi-4"
  "meta-llama/llama-4-scout:free"
)
MODEL_COUNT=${#MODELS[@]}; MODEL_IDX=0

for var in OPENROUTER_API_KEY SUPABASE_URL SUPABASE_SERVICE_KEY; do
  [ -z "${!var:-}" ] && echo "❌ Missing $var" && exit 1
done

INSERTED=0; FAILED=0; SKIPPED=0
LOGFILE="generate_showcase_$(date +%Y%m%d_%H%M%S).log"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOGFILE"; }

log "═══ BETA SHOWCASE — 50 topics/subject, visual-aware ═══"
log "  Target: ${TARGET_MIN}/topic, Batch: ${BATCH_SIZE}, DryRun: ${DRY_RUN}"

count_existing() {
  local c s y t; c="$1" s="$2" y="$3" t="$4"
  local n
  n=$(curl -s "${SUPABASE_REST}/question_bank?select=id&curriculum=eq.${c}&subject=eq.${s}&year_level=eq.${y}&topic=eq.${t}&question_text=not.is.null" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Prefer: count=exact" -H "Range: 0-0" -I 2>/dev/null | grep -i 'content-range' | sed 's/.*\///' | tr -dc '0-9' || echo "0")
  echo "${n:-0}"
}

validate_q() {
  local j="$1" yr="${2:-4}" sub="${3:-mathematics}"
  local qt ol av et
  qt=$(echo "$j"|jq -r '.q//"''"'); ol=$(echo "$j"|jq '.opts|length//0'); av=$(echo "$j"|jq '.a//-1'); et=$(echo "$j"|jq -r '.exp//"''"')

  # ── Structural checks ──────────────────────────────────────────────
  [ ${#qt} -lt 15 ]&&echo "F:q_too_short"&&return
  [ "$ol" -ne 4 ]&&echo "F:not_4_opts"&&return
  [ "$av" -lt 0 ]||[ "$av" -gt 3 ]&&echo "F:bad_index"&&return
  [ ${#et} -lt 25 ]&&echo "F:exp_too_short"&&return

  # Reject self-contradicting explanations
  if echo "$et" | grep -qiE 'needs revision|needs correction|is incorrect|should be.*not|however.*correct.*should|adjusting|question needs|this is wrong'; then
    echo "F:contradicting_exp"; return
  fi

  # Duplicate options
  local uo; uo=$(echo "$j"|jq '[.opts[]|tostring|ascii_downcase|gsub("^\\s+|\\s+$";"")]|unique|length' 2>/dev/null || echo "0")
  [ "$uo" -lt 4 ]&&echo "F:dup_opts"&&return

  # ── G2: Number cap by year ─────────────────────────────────────────
  local num_cap=999999999
  [ "$yr" -le 1 ]&&num_cap=20
  [ "$yr" -eq 2 ]&&num_cap=100
  [ "$yr" -eq 3 ]&&num_cap=1000
  [ "$yr" -eq 4 ]&&num_cap=10000

  if [ "$num_cap" -lt 999999999 ]; then
    local max_num
    max_num=$(echo "$j" | jq -r '[.q,.opts[]]|join(" ")' | grep -oE '[0-9]+' | sort -n | tail -1)
    max_num="${max_num:-0}"
    # Exclude dates (1900-2100)
    if [ "$max_num" -gt "$num_cap" ] && { [ "$max_num" -lt 1900 ] || [ "$max_num" -gt 2100 ]; }; then
      echo "F:G2_num_${max_num}_exceeds_${num_cap}"; return
    fi
  fi

  # ── Subject-specific guards (maths) ────────────────────────────────
  local qt_lower
  qt_lower=$(echo "$qt" | tr '[:upper:]' '[:lower:]')
  local all_text
  all_text=$(echo "$j" | jq -r '[.q,.opts[],.exp]|join(" ")' | tr '[:upper:]' '[:lower:]')

  if echo "$sub" | grep -qiE 'math'; then

    # G3: Y1 no division (only halving)
    if [ "$yr" -le 1 ]; then
      if echo "$qt_lower" | grep -qiE '÷|divide|division|share\s|split\s|how many (each|groups)'; then
        if ! echo "$qt_lower" | grep -qiE '\bhalf\b|\bhalves\b|\bhalving\b'; then
          echo "F:G3_Y1_division"; return
        fi
      fi
    fi

    # G4: Negative numbers before Y6
    if [ "$yr" -lt 6 ]; then
      if echo "$all_text" | grep -qE '(^|[^a-zA-Z])-[0-9]+|negative number|below zero'; then
        echo "F:G4_negative_before_Y6"; return
      fi
    fi

    # G5: Decimals before Y3
    if [ "$yr" -le 2 ]; then
      if echo "$all_text" | grep -qE '[0-9]+\.[0-9]+'; then
        echo "F:G5_decimal_before_Y3"; return
      fi
    fi

    # G5: Percentages before Y5
    if [ "$yr" -le 4 ]; then
      if echo "$all_text" | grep -qiE '%|percent'; then
        echo "F:G5_percent_before_Y5"; return
      fi
    fi

    # G5: Ratios before Y6
    if [ "$yr" -le 5 ]; then
      if echo "$all_text" | grep -qiE '\bratio\b|[0-9]+\s*:\s*[0-9]+'; then
        echo "F:G5_ratio_before_Y6"; return
      fi
    fi

    # G6: Algebra before Y6
    if [ "$yr" -lt 6 ]; then
      if echo "$all_text" | grep -qiE '\balgebra\b|\bequation\b|solve\s+for|find\s+(the\s+value\s+of\s+)?[xyn]\b|[0-9]+[xyn]\s*[+=\-]'; then
        echo "F:G6_algebra_before_Y6"; return
      fi
    fi

    # G7: Advanced maths topics
    if [ "$yr" -lt 7 ]; then
      if echo "$all_text" | grep -qiE '\bpythagoras\b|\btrigonometry\b|\bsin\b|\bcos\b|\btan\b|\bcalculus\b'; then
        echo "F:G7_advanced_maths"; return
      fi
    fi

    # G8: Multiplication tables beyond year level
    if [ "$yr" -le 2 ]; then
      local mul_match
      mul_match=$(echo "$qt_lower" | grep -oiE '([0-9]+)\s*[×x*]\s*([0-9]+)' | head -1)
      if [ -n "$mul_match" ]; then
        local a b
        a=$(echo "$mul_match" | grep -oE '[0-9]+' | head -1)
        b=$(echo "$mul_match" | grep -oE '[0-9]+' | tail -1)
        # Y2: only ×2, ×5, ×10
        if ! echo "2 5 10" | grep -qw "$a" && ! echo "2 5 10" | grep -qw "$b"; then
          echo "F:G8_Y2_mul_${a}x${b}"; return
        fi
      fi
      # Also catch word form: "N times N" or "N multiplied by N"
      mul_match=$(echo "$qt_lower" | grep -oiE '([0-9]+)\s*(times|multiplied by|groups of)\s*([0-9]+)' | head -1)
      if [ -n "$mul_match" ]; then
        local a b
        a=$(echo "$mul_match" | grep -oE '[0-9]+' | head -1)
        b=$(echo "$mul_match" | grep -oE '[0-9]+' | tail -1)
        if ! echo "2 5 10" | grep -qw "$a" && ! echo "2 5 10" | grep -qw "$b"; then
          echo "F:G8_Y2_mul_word_${a}x${b}"; return
        fi
      fi
    fi

    # G1: Number bond multi-correct check
    if echo "$qt_lower" | grep -qiE 'adds?\s+up\s+to|total[s]?\s+[0-9]|make[s]?\s+[0-9]|sum\s|number\s*bond|equal[s]?\s+[0-9]'; then
      local target
      target=$(echo "$qt_lower" | grep -oiE '(total[s]?|make[s]?|adds?\s+up\s+to|sum\s+(is|of|to)|equal[s]?)\s+([0-9]+)' | grep -oE '[0-9]+' | tail -1)
      if [ -n "$target" ]; then
        local correct_count=0
        for oi in 0 1 2 3; do
          local opt_text
          opt_text=$(echo "$j" | jq -r ".opts[$oi]" | tr '[:upper:]' '[:lower:]')
          # Extract "X and Y" pair
          local pair_sum
          pair_sum=$(echo "$opt_text" | grep -oiE '([0-9]+)\s*(and|&)\s*([0-9]+)' | head -1)
          if [ -n "$pair_sum" ]; then
            local pa pb
            pa=$(echo "$pair_sum" | grep -oE '[0-9]+' | head -1)
            pb=$(echo "$pair_sum" | grep -oE '[0-9]+' | tail -1)
            if [ $((pa + pb)) -eq "$target" ]; then
              correct_count=$((correct_count + 1))
            fi
          fi
        done
        if [ "$correct_count" -gt 1 ]; then
          echo "F:G1_multi_correct_bond_${correct_count}"; return
        fi
        if [ "$correct_count" -eq 0 ] && echo "$qt_lower" | grep -qiE 'total|bond|adds.*to|make'; then
          echo "F:G1_zero_correct_bond"; return
        fi
      fi
    fi
  fi

  # ── Subject-specific guards (english) ──────────────────────────────
  if echo "$sub" | grep -qiE 'english'; then
    # G10: Grammar terminology too early
    if [ "$yr" -lt 4 ] && echo "$all_text" | grep -qiE 'fronted adverbial|possessive apostrophe|determiner'; then
      echo "F:G10_grammar_Y${yr}"; return
    fi
    if [ "$yr" -lt 5 ] && echo "$all_text" | grep -qiE 'modal verb|relative clause|relative pronoun|parenthesis'; then
      echo "F:G10_grammar_Y${yr}"; return
    fi
    if [ "$yr" -lt 6 ] && echo "$all_text" | grep -qiE 'subjunctive|passive voice|active voice|semi-colon|ellipsis'; then
      echo "F:G10_grammar_Y${yr}"; return
    fi
    # G9: Vocab-definition spelling for Y1-2
    if [ "$yr" -le 2 ]; then
      if echo "$qt_lower" | grep -qiE 'word\s+that\s+means|spelling.*word\s+for|correct\s+spelling.*means'; then
        echo "F:G9_vocab_spell_Y${yr}"; return
      fi
    fi
  fi

  # ── Subject-specific guards (science) ──────────────────────────────
  if echo "$sub" | grep -qiE 'science|biology|chemistry|physics'; then
    if [ "$yr" -lt 3 ] && echo "$all_text" | grep -qiE 'photosynthesis'; then
      echo "F:G12_photosynthesis_Y${yr}"; return
    fi
    if [ "$yr" -lt 4 ] && echo "$all_text" | grep -qiE 'evaporation|condensation'; then
      echo "F:G12_evap_Y${yr}"; return
    fi
    if [ "$yr" -lt 7 ] && echo "$all_text" | grep -qiE '\bdna\b|chromosome|allele|electron|proton|neutron|periodic table|mitosis'; then
      echo "F:G12_advanced_science_Y${yr}"; return
    fi
  fi

  # ── G14: Question too long for young scholars ──────────────────────
  local word_count
  word_count=$(echo "$qt" | wc -w)
  if [ "$yr" -le 2 ] && [ "$word_count" -gt 35 ]; then
    echo "F:G14_too_long_${word_count}w"; return
  fi
  if [ "$yr" -le 4 ] && [ "$word_count" -gt 60 ]; then
    echo "F:G14_too_long_${word_count}w"; return
  fi

  # ── G17: Explanation contradicts marked answer ─────────────────────
  local marked_answer exp_answer
  marked_answer=$(echo "$j" | jq -r ".opts[$av]" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  exp_answer=$(echo "$et" | tr '[:upper:]' '[:lower:]' | grep -oiE '(the\s+)?(correct\s+)?answer\s+is\s+([0-9]+)' | grep -oE '[0-9]+' | tail -1)
  if [ -n "$exp_answer" ] && [ -n "$marked_answer" ]; then
    # Check if exp claims a different number than the marked answer starts with
    local marked_num
    marked_num=$(echo "$marked_answer" | grep -oE '^[0-9]+' | head -1)
    if [ -n "$marked_num" ] && [ "$exp_answer" != "$marked_num" ]; then
      # Verify the exp_answer is actually one of the other options
      for oi in 0 1 2 3; do
        [ "$oi" -eq "$av" ] && continue
        local other_opt
        other_opt=$(echo "$j" | jq -r ".opts[$oi]" | tr '[:upper:]' '[:lower:]' | grep -oE '^[0-9]+' | head -1)
        if [ "$other_opt" = "$exp_answer" ]; then
          echo "F:G17_exp_says_${exp_answer}_marked_${marked_num}"; return
        fi
      done
    fi
  fi

  echo "OK"
}

generate_batch() {
  local cur="$1" nm="$2" sp="$3" gr="$4" sub="$5" top="$6" yr="$7" vh="$8" etag="${9:-}"
  local cm="${MODELS[$MODEL_IDX]}"; MODEL_IDX=$(((MODEL_IDX+1)%MODEL_COUNT))
  local sd="${sub//_/ }" td="${top//_/ }"

  # ── AGE-APPROPRIATE CONSTRAINTS (mirrors postProcessQuestions guards G1-G17) ──
  local dg="" constraints=""

  if [ "$yr" -le 1 ]; then
    dg="Foundation: single-step, basic vocabulary, ages 5-6. Reception/Year 1."
    constraints="YEAR ${yr} HARD CONSTRAINTS — VIOLATION = REJECTED QUESTION:
- ALL numbers must be 20 or less. No exceptions — not in the question, not in the options, not anywhere.
- NO multiplication (only counting in 2s, 5s, 10s is allowed).
- NO division (only 'half of' is allowed — e.g. 'What is half of 10?').
- NO fractions except 'half'. No ¼, ¾, ⅓ — only 'half'.
- NO decimals. NO percentages. NO negative numbers. NO algebra.
- Number bonds: there must be EXACTLY ONE correct pair. Check every option sums to the target.
- Questions must be ≤25 words. Use simple 1-2 syllable words. Options should be single numbers or 1-3 word phrases.
- Science: use only everyday words (hot, cold, push, pull, grow, plant, animal). No 'photosynthesis', 'evaporation', 'condensation'.
- English: CVC words, sight words, basic phonics only. No complex grammar terminology."

  elif [ "$yr" -le 2 ]; then
    dg="Foundation: single-step to two-step, basic vocabulary, ages 6-7. Year 2."
    constraints="YEAR ${yr} HARD CONSTRAINTS — VIOLATION = REJECTED QUESTION:
- ALL numbers must be 100 or less.
- Multiplication: ONLY ×2, ×5, ×10 tables. No ×3, ×4, ×6, ×7, ×8, ×9.
- Division: only simple sharing within 20. Dividend must be ≤20. NO remainders. NO odd÷2.
- Fractions: only ½, ¼, ⅓. No ¾, ⅔, ⅕, ⅛.
- NO decimals. NO percentages. NO negative numbers. NO algebra. NO ratios.
- Number bonds: EXACTLY ONE correct pair. Verify all options.
- Questions must be ≤30 words. No words longer than 10 letters in options.
- Science: no 'photosynthesis', 'evaporation', 'condensation', 'DNA', 'chromosome'.
- English: no 'fronted adverbial', 'subordinate clause', 'modal verb', 'passive voice'. No vocab-definition spelling tasks."

  elif [ "$yr" -le 4 ]; then
    dg="Developing: two-step, age 7-9. Years 3-4."
    constraints="YEAR ${yr} HARD CONSTRAINTS — VIOLATION = REJECTED QUESTION:
- Year 3: numbers up to 1,000. Year 4: numbers up to 10,000.
- Year 3 multiplication: ×2, ×3, ×4, ×5, ×8, ×10 only. Year 4: all tables to 12×12.
- Division: allowed but NO remainders (remainders start Year 5).
- Fractions: unit fractions and simple equivalence. NO decimals for Year 3. Year 4: tenths and hundredths only.
- NO percentages. NO ratios. NO negative numbers. NO algebra (no 'solve for x', no 'find n').
- NO 'none of the above' or 'all of the above' options.
- Number bonds: EXACTLY ONE correct answer. Verify every option against the target.
- Science: no 'DNA', 'chromosome', 'atomic structure', 'electron', 'periodic table'. Year 3+: 'photosynthesis' is OK.
- English Year 3: no 'fronted adverbial', 'modal verb', 'passive voice', 'subjunctive'. Year 4: 'fronted adverbial' OK.
- No chemical formulas (NaCl, H2SO4 etc.) — only CO2 and H2O as common names."

  elif [ "$yr" -le 6 ]; then
    dg="Expected: multi-step, abstract, age 9-11. Years 5-6."
    constraints="YEAR ${yr} HARD CONSTRAINTS — VIOLATION = REJECTED QUESTION:
- Year 5: numbers up to 1,000,000. Year 6: larger numbers OK.
- Year 5+: percentages OK. Year 6: ratios, simple algebra (one-step equations) OK.
- Year 5: NO negative numbers. Year 6: negative numbers OK.
- Division with remainders: Year 5+ OK.
- NO Pythagoras, trigonometry, simultaneous equations, quadratics, vectors, calculus.
- NO chemical formula notation (NaCl, HCl etc.) in options — only CO2/H2O as common knowledge.
- Science Year 5: no 'DNA', 'chromosome', 'mitosis', 'electron', 'proton'. Year 6: 'evolution', 'inheritance' OK.
- English Year 5: 'modal verb', 'relative clause' OK. Year 6: 'passive voice', 'subjunctive' OK.
- Number bonds: EXACTLY ONE correct answer. Verify every option."

  elif [ "$yr" -le 9 ]; then
    dg="Higher: complex multi-step, age 11-14. Years 7-9."
    constraints="YEAR ${yr} CONSTRAINTS:
- Algebra, negative numbers, Pythagoras (Year 8+), basic trigonometry (Year 9+) OK.
- NO calculus, matrices, complex numbers.
- Chemical formulas OK. Balanced equations OK.
- Science: DNA, genetics, atomic structure, periodic table all OK.
- Questions can be longer and use technical vocabulary appropriate for secondary school."

  else
    dg="Advanced: synthesis, proof, age 14-18. Years 10+."
    constraints="YEAR ${yr} CONSTRAINTS:
- Full GCSE/A-level content permitted.
- Calculus, vectors, advanced algebra, statistical distributions all OK.
- Maintain exam-appropriate difficulty and language."
  fi

  local vi=""
  [ "$vh" != "none" ]&&[ -n "$vh" ]&&vi="IMPORTANT: A ${vh} will be shown alongside these questions. Write questions that REFERENCE the visual — e.g. 'Look at the diagram...', 'The chart shows...', 'What fraction is shaded?'. Include specific numbers the visual parser can extract."

  # Exam-specific prompt additions
  local exam_inst=""
  case "$etag" in
    eleven_plus) exam_inst="These questions are for 11+ entrance exam preparation. Match the style and difficulty of GL Assessment and CEM papers. Questions should be challenging but fair for age 10-11.";;
    gcse) exam_inst="These questions are GCSE exam style. Match AQA/Edexcel/OCR format. Include questions worth 1-4 marks. Use formal exam language.";;
    waec) exam_inst="These questions are WAEC (West African Examinations Council) exam style. Match the WASSCE format and difficulty. Use formal academic language appropriate for Nigerian SSS students.";;
    neco) exam_inst="These questions are NECO (National Examinations Council) exam style for Nigerian SSS students. Match SSCE format and difficulty.";;
  esac

  local sp_full="You are an expert ${nm} question writer (${sp} English).
Write ${BATCH_SIZE} MCQs for ${gr} ${yr} on ${sd}: '${td}'.
${vi}
${exam_inst}

${constraints}

RULES:
1. 4 unique options each, exactly 1 correct. Randomise correct index (0-3).
2. VERIFY YOUR ANSWER: Before finalising each question, mentally solve it yourself. The option at index 'a' MUST be the mathematically/factually correct answer. If the question asks '3000 + 5 = ?' and option index 2 is '3005', then a MUST be 2.
3. The explanation MUST show the working that arrives at the correct option. If your explanation arrives at a different answer than opts[a], FIX the answer index.
4. NEVER write 'the question needs revision' or 'this is incorrect' in an explanation. If you cannot make a correct question, skip it entirely.
5. Explanation ≥40 chars teaching WHY the answer is correct.
6. No 'none of the above' or 'all of the above'.
7. ${sp} spelling. ${dg}
8. For number bond / 'which numbers total N' questions: manually check that ONLY ONE option pair sums to N. If two pairs sum correctly, change one option.
9. EVERY number in the question and options must obey the year constraints above. Do not use numbers larger than allowed.
Return ONLY JSON array: [{\"q\":\"...\",\"opts\":[...],\"a\":N,\"exp\":\"...\"}]"

  local resp ct
  resp=$(curl -s --max-time 90 "${OPENROUTER_URL}" \
    -H "Content-Type: application/json" -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
    -H "HTTP-Referer: https://launchpard.com" -H "X-Title: LaunchPard-Showcase" \
    -d "$(jq -n --arg m "$cm" --arg s "$sp_full" --arg u "Generate ${BATCH_SIZE} ${sd} MCQs on '${td}' for ${gr} ${yr}." \
      '{model:$m,temperature:0.8,max_tokens:4096,messages:[{role:"system",content:$s},{role:"user",content:$u}]}')" 2>/dev/null)
  ct=$(echo "$resp"|jq -r '.choices[0].message.content//empty' 2>/dev/null)
  [ -z "$ct" ]&&FAILED=$((FAILED+BATCH_SIZE))&&return
  ct=$(python3 -c "
import sys,json,re
r=sys.stdin.read();r=re.sub(r'\x60\x60\x60json\s*','',r);r=re.sub(r'\x60\x60\x60\s*','',r)
m=re.search(r'\[[\s\S]*\]',r,re.DOTALL)
if m:
 try:print(json.dumps(json.loads(m.group())))
 except:print('INVALID')
else:print('INVALID')
"<<<"$ct")
  [ "$ct" = "INVALID" ]&&log "    ✗ JSON [${cm##*/}]"&&FAILED=$((FAILED+BATCH_SIZE))&&return

  local cnt ib=0
  cnt=$(echo "$ct"|jq 'length')
  for i in $(seq 0 $((cnt-1))); do
    local qj=$(echo "$ct"|jq -c ".[$i]")
    local vresult
    vresult=$(validate_q "$qj" "$yr" "$sub")
    if [ "$vresult" != "OK" ]; then
      log "    ⊘ Skipped: ${vresult} — $(echo "$qj"|jq -r '.q'|head -c 60)"
      SKIPPED=$((SKIPPED+1)); continue
    fi
    [ "$DRY_RUN" = "1" ]&&ib=$((ib+1))&&INSERTED=$((INSERTED+1))&&continue
    local qt qe ai o0 o1 o2 o3 dt
    qt=$(echo "$qj"|jq -r '.q'); qe=$(echo "$qj"|jq -r '.exp'); ai=$(echo "$qj"|jq '.a')
    o0=$(echo "$qj"|jq -r '.opts[0]'); o1=$(echo "$qj"|jq -r '.opts[1]')
    o2=$(echo "$qj"|jq -r '.opts[2]'); o3=$(echo "$qj"|jq -r '.opts[3]')
    [ "$yr" -le 3 ]&&dt="foundation"||{ [ "$yr" -le 6 ]&&dt="developing"||{ [ "$yr" -le 9 ]&&dt="expected"||dt="exceeding"; }; }
    local hc
    hc=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_REST}/question_bank" \
      -H "apikey: ${SUPABASE_SERVICE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
      -H "Content-Type: application/json" -H "Prefer: return=minimal" \
      -d "$(jq -n --arg qt "$qt" --arg sub "$sub" --arg cur "$cur" --argjson yr "$yr" --arg top "$top" \
        --arg exp "$qe" --argjson ai "$ai" --arg o0 "$o0" --arg o1 "$o1" --arg o2 "$o2" --arg o3 "$o3" \
        --arg dt "$dt" --arg et "$etag" \
        '{question_text:$qt,subject:$sub,curriculum:$cur,year_level:$yr,topic:$top,explanation:$exp,
          correct_index:$ai,options:[$o0,$o1,$o2,$o3],difficulty_tier:$dt,question_type:"mcq",source:"ai",is_active:true}
          + (if $et != "" then {exam_tag:$et} else {} end)')")
    [ "$hc" = "201" ]&&ib=$((ib+1))&&INSERTED=$((INSERTED+1))||FAILED=$((FAILED+1))
  done
  [ "$ib" -gt 0 ]&&log "    +${ib} [${cm##*/}] (${td})"
}

# ═══════════════════════════════════════════════════════════════════════════════
# SHOWCASE TOPICS — 50 per subject, grouped by curriculum
# Format: curriculum|name|spelling|grade|year_start|year_end|subject|topic|visual_hint|exam_tag
# exam_tag: eleven_plus, gcse, waec, neco, or empty for general curriculum
# ═══════════════════════════════════════════════════════════════════════════════

SHOWCASE=(
# ╔═══════════════════════════════════════════════════════════════════╗
# ║  UK 11+ MATHEMATICS — 50 topics (Years 3-6)                     ║
# ╚═══════════════════════════════════════════════════════════════════╝
"uk_11plus|UK 11+|british|Year|3|6|mathematics|counting_objects|counting dots visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|number_bonds_to_10|number bond diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|number_bonds_to_20|number bond diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|addition_within_20|addition dots visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|addition_with_regrouping|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|subtraction_within_20|subtraction crossed-out dots|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|subtraction_with_regrouping|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|multiplication_tables_facts|multiplication grid visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|multiplication_2digit_1digit|long multiplication layout|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|long_division|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|division_with_remainders|division grouping visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|place_value_hundreds|place value chart|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|place_value_thousands|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|ordering_numbers|number line visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|rounding_to_nearest_100|number line visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|roman_numerals_to_1000|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|negative_numbers_in_context|number line visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|fractions_identifying|fraction circle diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|fractions_equivalent|fraction circle diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|fractions_add_subtract|fraction bar diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|fractions_of_amounts|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|decimals_place_value|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|decimals_fractions_convert|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|percentages_of_amounts|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|ratio_introduction|ratio bar visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|proportion_word_problems|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|order_of_operations_brackets|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|factors_and_multiples|Venn diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|prime_numbers|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|square_numbers_and_roots|none|"
"uk_11plus|UK 11+|british|Year|5|6|mathematics|algebra_solving_one_step|none|"
"uk_11plus|UK 11+|british|Year|5|6|mathematics|algebra_function_machines|none|"
"uk_11plus|UK 11+|british|Year|5|6|mathematics|algebra_sequences_nth_term|number sequence visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|telling_time_hours|clock face visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|time_duration_calculation|clock face visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|money_calculations|coin visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|angles_identifying_types|angle diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|angles_in_triangle|triangle angle diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|angles_on_straight_line|angles on line diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|area_squares_rectangles|area rectangle visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|perimeter_basic_shapes|perimeter visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|volume_cubes_cuboids|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|symmetry_lines|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|coordinates_quadrants|coordinate grid|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|transformations_reflection|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|nets_of_3d_shapes|3D net visual|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|data_bar_charts|bar chart|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|data_venn_diagrams|Venn diagram|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|probability_simple|none|"
"uk_11plus|UK 11+|british|Year|3|6|mathematics|averages_mean|data table|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  UK 11+ ENGLISH — 50 topics (Years 3-6)                         ║
# ╚═══════════════════════════════════════════════════════════════════╝
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_literal|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_inference|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_vocabulary|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_authors_purpose|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_tone_mood|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_main_idea|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_cause_effect|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|comprehension_prediction|passage reading|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_nouns_common_proper|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_nouns_abstract_concrete|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_verbs_tense_past|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_verbs_tense_present|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_verbs_tense_future|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_verbs_modal|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_adjectives|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_adverbs|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_prepositions|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_conjunctions_coordinating|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_conjunctions_subordinating|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_pronouns_personal|grammar visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_active_passive_voice|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_direct_indirect_speech|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_sentence_structure_simple|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_sentence_structure_compound|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|grammar_sentence_structure_complex|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|punctuation_commas_lists|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|punctuation_apostrophes_possession|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|punctuation_apostrophes_contractions|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|punctuation_quotation_marks|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|punctuation_semicolons|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|spelling_prefixes|word builder visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|spelling_suffixes|word builder visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|spelling_homophones|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|spelling_silent_letters|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|spelling_doubling_consonants|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|vocabulary_synonyms|synonym ladder visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|vocabulary_antonyms|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|vocabulary_prefixes|word builder visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|vocabulary_suffixes|word builder visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|vocabulary_idioms|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|vocabulary_greek_latin_roots|word builder visual|"
"uk_11plus|UK 11+|british|Year|3|6|english|literature_devices_simile|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|literature_devices_metaphor|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|literature_devices_personification|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|literature_devices_alliteration|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|literature_elements_plot|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|literature_elements_character|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|writing_purpose_persuasive|none|"
"uk_11plus|UK 11+|british|Year|3|6|english|writing_paragraph_structure|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  UK 11+ VERBAL REASONING — 50 topics                            ║
# ╚═══════════════════════════════════════════════════════════════════╝
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_analogies_synonyms|analogy visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_analogies_antonyms|analogy visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_analogies_part_whole|analogy visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_analogies_category_member|analogy visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_analogies_function|analogy visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_analogies_degree|analogy visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|odd_one_out_words|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|coded_sequences_letter_shift|alphabet strip|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|coded_sequences_number_letter|alphabet strip|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|hidden_words_in_sentences|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|anagrams_word_rearrangement|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|letter_patterns_sequences|alphabet strip|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|letter_patterns_alphabet_position|alphabet strip|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|number_patterns_sequences|number sequence visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|code_breaking_substitution|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|cipher_decoding|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_matches|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_completion|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|cloze_sentences|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|sentence_completion|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|word_connections|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|compound_words|word builder visual|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|homophones|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|synonyms_in_context|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|antonyms_in_context|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|classification_word_groups|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|deductive_reasoning|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|logic_puzzles|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|critical_thinking|none|"
"uk_11plus|UK 11+|british|Year|3|6|verbal_reasoning|homographs|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  UK 11+ NVR — 26 topics (all available)                         ║
# ╚═══════════════════════════════════════════════════════════════════╝
"uk_11plus|UK 11+|british|Year|3|6|nvr|shape_sequences|NVR shape sequence|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|shape_matrices|matrix visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|odd_one_out_shapes|odd one out visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|reflections_horizontal_vertical|reflection visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|rotations_clockwise_anticlockwise|rotation visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|rotations_90_180_270|rotation visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|translations|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|combining_shapes|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|separating_shapes|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|shape_codes|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|symbol_substitution|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|following_folds_paper_folding|paper fold visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|nets_of_cubes|3D net visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|nets_of_3d_shapes|3D net visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|cube_views|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|3d_visualization|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|spatial_awareness|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|similar_figures|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|congruent_figures|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|symmetry|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|pattern_completion|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|analogous_figures|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|embedded_figures|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|figure_classification|none|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|mirror_images|reflection visual|"
"uk_11plus|UK 11+|british|Year|3|6|nvr|shape_construction|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  UK 11+ SCIENCE — 50 topics (Years 3-6)                         ║
# ╚═══════════════════════════════════════════════════════════════════╝
"uk_11plus|UK 11+|british|Year|3|6|science|plants_growth|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|plants_what_they_need|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|animals_classification|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|human_body_skeleton|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|human_body_digestive_system|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|human_body_circulatory_system|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|human_body_nutrition|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|living_things_habitats|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|living_things_food_chains|food chain diagram|"
"uk_11plus|UK 11+|british|Year|3|6|science|living_things_adaptation|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|living_things_life_cycles|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|materials_properties|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|materials_rocks_soils|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|materials_magnetism|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|states_of_matter_solids_liquids_gases|states of matter visual|"
"uk_11plus|UK 11+|british|Year|3|6|science|states_of_matter_changing_state|states of matter visual|"
"uk_11plus|UK 11+|british|Year|3|6|science|states_of_matter_water_cycle|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|light_sources|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|light_shadows|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|light_reflection|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|sound_vibrations|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|sound_pitch_volume|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|forces_gravity|forces diagram|"
"uk_11plus|UK 11+|british|Year|3|6|science|forces_friction|forces diagram|"
"uk_11plus|UK 11+|british|Year|3|6|science|forces_magnets|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|electricity_simple_circuits|circuit diagram|"
"uk_11plus|UK 11+|british|Year|3|6|science|electricity_safety|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|earth_day_night|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|earth_seasons|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|earth_solar_system|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|evolution_inheritance|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|evolution_adaptation|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|environment_habitats|none|"
"uk_11plus|UK 11+|british|Year|3|6|science|environment_protection|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  UK NATIONAL KS3 — 50 topics (Years 7-9, separate sciences)     ║
# ╚═══════════════════════════════════════════════════════════════════╝
"uk_national|UK National|british|Year|7|9|mathematics|algebra_solving_two_step|none|"
"uk_national|UK National|british|Year|7|9|mathematics|algebra_solving_with_unknown_both_sides|none|"
"uk_national|UK National|british|Year|7|9|mathematics|algebra_graphs_equation_of_line|coordinate graph|"
"uk_national|UK National|british|Year|7|9|mathematics|simultaneous_equations|coordinate graph with equations|"
"uk_national|UK National|british|Year|7|9|mathematics|pythagoras_theorem|none|"
"uk_national|UK National|british|Year|7|9|mathematics|trigonometry_sohcahtoa|formula triangle|"
"uk_national|UK National|british|Year|7|9|mathematics|angles_parallel_lines|angle diagram|"
"uk_national|UK National|british|Year|7|9|mathematics|circle_area|none|"
"uk_national|UK National|british|Year|7|9|mathematics|circumference|none|"
"uk_national|UK National|british|Year|7|9|mathematics|probability_tree_diagrams|none|"
"uk_national|UK National|british|Year|7|9|mathematics|statistics_histograms|bar chart|"
"uk_national|UK National|british|Year|7|9|mathematics|averages_from_frequency_tables|data table|"
"uk_national|UK National|british|Year|7|9|mathematics|percentage_increase_decrease|none|"
"uk_national|UK National|british|Year|7|9|mathematics|rates_speed_distance_time|formula triangle|"
"uk_national|UK National|british|Year|7|9|mathematics|number_indices|none|"
"uk_national|UK National|british|Year|7|9|mathematics|number_standard_form|none|"
"uk_national|UK National|british|Year|7|9|mathematics|transformations_enlargement|coordinate grid|"
"uk_national|UK National|british|Year|7|9|science|biology_cell_structure|cell diagram|"
"uk_national|UK National|british|Year|7|9|science|biology_cell_division_mitosis|none|"
"uk_national|UK National|british|Year|7|9|science|biology_digestive_system|none|"
"uk_national|UK National|british|Year|7|9|science|biology_photosynthesis|none|"
"uk_national|UK National|british|Year|7|9|science|biology_ecology_food_chains_webs|food chain diagram|"
"uk_national|UK National|british|Year|7|9|science|biology_genetics_inheritance|Punnett square|"
"uk_national|UK National|british|Year|7|9|science|biology_evolution_natural_selection|none|"
"uk_national|UK National|british|Year|7|9|science|biology_classification|none|"
"uk_national|UK National|british|Year|7|9|science|chemistry_atoms_elements|atom model visual|"
"uk_national|UK National|british|Year|7|9|science|chemistry_periodic_table|periodic table visual|"
"uk_national|UK National|british|Year|7|9|science|chemistry_chemical_reactions|none|"
"uk_national|UK National|british|Year|7|9|science|chemistry_acids_bases|pH scale visual|"
"uk_national|UK National|british|Year|7|9|science|chemistry_states_of_matter_particle_model|states of matter visual|"
"uk_national|UK National|british|Year|7|9|science|chemistry_bonding_ionic|none|"
"uk_national|UK National|british|Year|7|9|science|chemistry_bonding_covalent|molecule diagram|"
"uk_national|UK National|british|Year|7|9|science|physics_forces_newton_laws|force diagram|"
"uk_national|UK National|british|Year|7|9|science|physics_motion_speed|velocity arrow visual|"
"uk_national|UK National|british|Year|7|9|science|physics_energy_forms|energy stores visual|"
"uk_national|UK National|british|Year|7|9|science|physics_energy_transfers|energy stores visual|"
"uk_national|UK National|british|Year|7|9|science|physics_waves_sound|wave diagram|"
"uk_national|UK National|british|Year|7|9|science|physics_waves_light|wave diagram|"
"uk_national|UK National|british|Year|7|9|science|physics_waves_em_spectrum|EM spectrum visual|"
"uk_national|UK National|british|Year|7|9|science|physics_electricity_circuits|circuit diagram|"
"uk_national|UK National|british|Year|7|9|science|physics_electricity_current|none|"
"uk_national|UK National|british|Year|7|9|science|physics_magnetism|none|"
"uk_national|UK National|british|Year|7|9|science|physics_space_solar_system|none|"
"uk_national|UK National|british|Year|7|9|english|comprehension_literal|passage reading|"
"uk_national|UK National|british|Year|7|9|english|comprehension_inference|passage reading|"
"uk_national|UK National|british|Year|7|9|english|comprehension_vocabulary|passage reading|"
"uk_national|UK National|british|Year|7|9|english|grammar_active_passive_voice|grammar visual|"
"uk_national|UK National|british|Year|7|9|english|literature_devices_imagery|none|"
"uk_national|UK National|british|Year|7|9|english|literature_elements_theme|none|"
"uk_national|UK National|british|Year|7|9|english|writing_purpose_argumentative|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  NIGERIA PRIMARY — 50 topics (Years 1-6)                        ║
# ╚═══════════════════════════════════════════════════════════════════╝
"ng_primary|Nigerian Primary|british|Year|1|3|mathematics|counting_objects|counting dots visual|"
"ng_primary|Nigerian Primary|british|Year|1|3|mathematics|number_bonds_to_10|number bond diagram|"
"ng_primary|Nigerian Primary|british|Year|1|3|mathematics|addition_within_10|addition dots visual|"
"ng_primary|Nigerian Primary|british|Year|1|3|mathematics|addition_within_20|addition dots visual|"
"ng_primary|Nigerian Primary|british|Year|1|3|mathematics|subtraction_within_10|subtraction visual|"
"ng_primary|Nigerian Primary|british|Year|1|3|mathematics|subtraction_within_20|subtraction visual|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|multiplication_tables_facts|multiplication grid|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|division_facts|division visual|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|fractions_identifying|fraction circle|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|fractions_equivalent|fraction circle|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|place_value_tens_ones|place value chart|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|place_value_hundreds|place value chart|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|ordering_numbers|number line|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|telling_time_hours|clock face|"
"ng_primary|Nigerian Primary|british|Year|1|6|mathematics|money_counting|coin visual|"
"ng_primary|Nigerian Primary|british|Year|3|6|mathematics|angles_identifying_types|angle diagram|"
"ng_primary|Nigerian Primary|british|Year|3|6|mathematics|area_counting_squares|area visual|"
"ng_primary|Nigerian Primary|british|Year|3|6|mathematics|data_bar_charts|bar chart|"
"ng_primary|Nigerian Primary|british|Year|3|6|mathematics|data_pictograms|bar chart|"
"ng_primary|Nigerian Primary|british|Year|3|6|mathematics|patterns_sequences|number sequence|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|comprehension_literal|passage reading|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|comprehension_inference|passage reading|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|grammar_nouns_common_proper|grammar visual|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|grammar_verbs_tense_past|grammar visual|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|grammar_adjectives|grammar visual|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|spelling_common_exception_words|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|vocabulary_synonyms|synonym ladder|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|vocabulary_antonyms|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|punctuation_capitalization|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|english_studies|punctuation_periods|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|plants_parts_functions|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|animals_domestic_wild|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|human_body_systems|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|health_hygiene_practices|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|living_things_plants_animals|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|water_cycle|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|simple_machines_levers|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|energy_sources_renewable|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|environmental_conservation|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|basic_science|materials_properties_uses|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|social_studies|civic_text_analysis|passage reading|"
"ng_primary|Nigerian Primary|british|Year|1|6|civic_education|democracy_and_government|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|civic_education|rights_and_responsibilities|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|civic_education|national_symbols|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|cultural_and_creative_arts|music_basics|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|cultural_and_creative_arts|visual_arts|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|cultural_and_creative_arts|dance_drama|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|cultural_and_creative_arts|nigerian_culture|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|religious_studies|moral_values|none|"
"ng_primary|Nigerian Primary|british|Year|1|6|religious_studies|religious_stories|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  NIGERIA JSS — 50 topics (JSS 1-3)                              ║
# ╚═══════════════════════════════════════════════════════════════════╝
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|fractions_add_subtract|fraction visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|fractions_multiply|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|decimals_add_subtract|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|percentages_of_amounts|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|ratio_introduction|ratio bar visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|algebra_solving_one_step|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|algebra_solving_two_step|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|angles_in_triangle|angle diagram|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|angles_on_straight_line|angle on line diagram|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|area_squares_rectangles|area visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|perimeter_basic_shapes|perimeter visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|data_bar_charts|bar chart|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|data_venn_diagrams|Venn diagram|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|averages_mean|data table|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|probability_simple|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|coordinates_quadrants|coordinate grid|"
"ng_jss|Nigerian JSS|british|JSS|1|3|mathematics|number_sequences_increasing|number sequence|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|comprehension_literal|passage reading|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|comprehension_inference|passage reading|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|comprehension_vocabulary|passage reading|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|grammar_nouns_common_proper|grammar visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|grammar_verbs_tense_past|grammar visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|grammar_verbs_tense_present|grammar visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|grammar_adjectives|grammar visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|grammar_prepositions|grammar visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|spelling_prefixes|word builder|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|spelling_suffixes|word builder|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|vocabulary_synonyms|synonym ladder|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|literature_devices_simile|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|english_studies|literature_devices_metaphor|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|biology_cell_structure|cell diagram|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|states_of_matter_solids_liquids_gases|states visual|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|living_things_food_chains|food chain|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|forces_gravity|forces diagram|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|electricity_simple_circuits|circuit diagram|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|human_body_systems|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|water_cycle|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_science|environmental_conservation|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|social_studies|civic_text_analysis|passage reading|"
"ng_jss|Nigerian JSS|british|JSS|1|3|social_studies|nigerian_government|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|social_studies|nigerian_culture|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|civic_education|human_rights|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|civic_education|democracy_and_government|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_technology|simple_machines|none|"
"ng_jss|Nigerian JSS|british|JSS|1|3|basic_technology|materials_and_processing|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  NIGERIA SSS — 50 topics (SS 1-3, separate science subjects)    ║
# ╚═══════════════════════════════════════════════════════════════════╝
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|quadratic_equations|quadratic graph|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|simultaneous_equations|coordinate graph|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|trigonometry|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|statistics|data table|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|probability|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|vectors|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|calculus|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|linear_equations|coordinate graph|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|circle_theorems|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|mathematics|number_indices|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|physics|physics_forces_newton_laws|force diagram|"
"ng_sss|Nigerian SSS|british|SS|1|3|physics|physics_motion_velocity|velocity visual|"
"ng_sss|Nigerian SSS|british|SS|1|3|physics|physics_waves_sound|wave diagram|"
"ng_sss|Nigerian SSS|british|SS|1|3|physics|physics_electricity_circuits|circuit diagram|"
"ng_sss|Nigerian SSS|british|SS|1|3|physics|physics_energy_forms|energy stores|"
"ng_sss|Nigerian SSS|british|SS|1|3|physics|physics_light_reflection|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|physics|physics_magnetism|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|chemistry|chemistry_atoms_elements|atom model|"
"ng_sss|Nigerian SSS|british|SS|1|3|chemistry|chemistry_periodic_table|periodic table|"
"ng_sss|Nigerian SSS|british|SS|1|3|chemistry|chemistry_acids_bases|pH scale|"
"ng_sss|Nigerian SSS|british|SS|1|3|chemistry|chemistry_chemical_reactions|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|chemistry|chemistry_bonding_ionic|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|chemistry|chemistry_organic_hydrocarbons|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|biology|biology_cell_structure|cell diagram|"
"ng_sss|Nigerian SSS|british|SS|1|3|biology|biology_genetics_inheritance|Punnett square|"
"ng_sss|Nigerian SSS|british|SS|1|3|biology|biology_ecology_food_chains_webs|food chain|"
"ng_sss|Nigerian SSS|british|SS|1|3|biology|biology_photosynthesis|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|biology|biology_evolution_natural_selection|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|biology|biology_reproductive_system|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|english|comprehension_literal|passage reading|"
"ng_sss|Nigerian SSS|british|SS|1|3|english|comprehension_inference|passage reading|"
"ng_sss|Nigerian SSS|british|SS|1|3|english|comprehension_vocabulary|passage reading|"
"ng_sss|Nigerian SSS|british|SS|1|3|english|grammar_active_passive_voice|grammar visual|"
"ng_sss|Nigerian SSS|british|SS|1|3|english|literature_devices_imagery|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|commerce|break_even|break even chart|"
"ng_sss|Nigerian SSS|british|SS|1|3|commerce|supply_demand|supply demand graph|"
"ng_sss|Nigerian SSS|british|SS|1|3|commerce|trade_and_commerce|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|accounting|accounting_ledgers|T-account visual|"
"ng_sss|Nigerian SSS|british|SS|1|3|accounting|financial_statements|data table|"
"ng_sss|Nigerian SSS|british|SS|1|3|civic_education|human_rights|passage reading|"
"ng_sss|Nigerian SSS|british|SS|1|3|civic_education|democracy_and_government|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|civic_education|nigerian_constitution|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|geography|geography_climate_zones|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|geography|geography_population_distribution|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|geography|geography_natural_resources|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|history|history_colonialism|passage reading|"
"ng_sss|Nigerian SSS|british|SS|1|3|history|history_nigerian_independence|passage reading|"
"ng_sss|Nigerian SSS|british|SS|1|3|economics|economics_supply_demand|supply demand graph|"
"ng_sss|Nigerian SSS|british|SS|1|3|economics|economics_inflation|none|"
"ng_sss|Nigerian SSS|british|SS|1|3|government|government_branches|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  CANADA — 50 topics (Years 1-8, Canadian curriculum)             ║
# ║  Stored under ca_primary — TODO: add to DB if not exists      ║
# ║  Using british spelling variant closest to Canadian English      ║
# ╚═══════════════════════════════════════════════════════════════════╝
# MATHS (25 topics)
"ca_primary|Canadian|british|Grade|1|4|mathematics|counting_objects|counting dots visual|"
"ca_primary|Canadian|british|Grade|1|4|mathematics|number_bonds_to_20|number bond diagram|"
"ca_primary|Canadian|british|Grade|1|4|mathematics|addition_within_20|addition dots visual|"
"ca_primary|Canadian|british|Grade|1|4|mathematics|subtraction_within_20|subtraction visual|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|multiplication_tables_facts|multiplication grid|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|division_with_remainders|division visual|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|fractions_identifying|fraction circle|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|fractions_equivalent|fraction circle|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|fractions_add_subtract|fraction bar|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|decimals_place_value|none|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|percentages_of_amounts|none|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|place_value_thousands|place value chart|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|ordering_numbers|number line|"
"ca_primary|Canadian|british|Grade|1|8|mathematics|rounding_to_nearest_100|number line|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|angles_identifying_types|angle diagram|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|angles_in_triangle|triangle angle diagram|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|area_squares_rectangles|area visual|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|perimeter_basic_shapes|perimeter visual|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|coordinates_quadrants|coordinate grid|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|data_bar_charts|bar chart|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|data_venn_diagrams|Venn diagram|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|probability_simple|none|"
"ca_primary|Canadian|british|Grade|3|8|mathematics|averages_mean|data table|"
"ca_primary|Canadian|british|Grade|5|8|mathematics|algebra_solving_one_step|none|"
"ca_primary|Canadian|british|Grade|5|8|mathematics|patterns_sequences|number sequence|"
# ENGLISH (15 topics)
"ca_primary|Canadian|british|Grade|1|8|english|comprehension_literal|passage reading|"
"ca_primary|Canadian|british|Grade|1|8|english|comprehension_inference|passage reading|"
"ca_primary|Canadian|british|Grade|1|8|english|comprehension_vocabulary|passage reading|"
"ca_primary|Canadian|british|Grade|1|8|english|comprehension_authors_purpose|passage reading|"
"ca_primary|Canadian|british|Grade|1|8|english|grammar_nouns_common_proper|grammar visual|"
"ca_primary|Canadian|british|Grade|1|8|english|grammar_verbs_tense_past|grammar visual|"
"ca_primary|Canadian|british|Grade|1|8|english|grammar_adjectives|grammar visual|"
"ca_primary|Canadian|british|Grade|1|8|english|grammar_pronouns_personal|grammar visual|"
"ca_primary|Canadian|british|Grade|1|8|english|spelling_prefixes|word builder|"
"ca_primary|Canadian|british|Grade|1|8|english|spelling_suffixes|word builder|"
"ca_primary|Canadian|british|Grade|1|8|english|vocabulary_synonyms|synonym ladder|"
"ca_primary|Canadian|british|Grade|1|8|english|vocabulary_antonyms|none|"
"ca_primary|Canadian|british|Grade|1|8|english|literature_devices_simile|none|"
"ca_primary|Canadian|british|Grade|1|8|english|punctuation_commas_lists|none|"
"ca_primary|Canadian|british|Grade|1|8|english|punctuation_apostrophes_possession|none|"
# SCIENCE (10 topics)
"ca_primary|Canadian|british|Grade|1|8|science|living_things_food_chains|food chain|"
"ca_primary|Canadian|british|Grade|1|8|science|states_of_matter_solids_liquids_gases|states visual|"
"ca_primary|Canadian|british|Grade|1|8|science|forces_gravity|forces diagram|"
"ca_primary|Canadian|british|Grade|1|8|science|earth_solar_system|none|"
"ca_primary|Canadian|british|Grade|1|8|science|living_things_habitats|none|"
"ca_primary|Canadian|british|Grade|1|8|science|materials_properties|none|"
"ca_primary|Canadian|british|Grade|1|8|science|light_shadows|none|"
"ca_primary|Canadian|british|Grade|1|8|science|electricity_simple_circuits|circuit diagram|"
"ca_primary|Canadian|british|Grade|1|8|science|plants_growth|none|"
"ca_primary|Canadian|british|Grade|1|8|science|human_body_nutrition|none|"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  EXAM MODE: UK GCSE (Years 10-11) — exam_tag: gcse              ║
# ╚═══════════════════════════════════════════════════════════════════╝
"uk_national|UK GCSE|british|Year|10|11|mathematics|algebra_quadratic_equations|quadratic graph|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|algebra_simultaneous_equations|coordinate graph|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|trigonometry_sohcahtoa|formula triangle|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|trigonometry_sine_rule|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|trigonometry_cosine_rule|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|pythagoras_theorem|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|circle_theorems|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|vectors_2d|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|probability_tree_diagrams|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|probability_conditional|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|statistics_histograms|bar chart|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|statistics_box_plots|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|statistics_scatter_diagrams|coordinate graph|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|number_standard_form|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|number_surds|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|number_indices|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|graphs_quadratic_functions|quadratic graph|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|graphs_cubic_functions|coordinate graph|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|percentage_increase_decrease|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|mathematics|rates_speed_distance_time|formula triangle|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|biology_cell_division_mitosis|cell diagram|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|biology_genetics_inheritance|Punnett square|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|biology_evolution_natural_selection|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|biology_photosynthesis|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|biology_ecology_ecosystems|food chain|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|chemistry_atomic_structure|atom model|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|chemistry_bonding_ionic|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|chemistry_bonding_covalent|molecule diagram|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|chemistry_rates_of_reaction|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|chemistry_electrolysis|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|physics_forces_newton_laws|force diagram|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|physics_energy_conservation|energy stores|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|physics_waves_em_spectrum|EM spectrum|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|physics_electricity_resistance|circuit diagram|gcse"
"uk_national|UK GCSE|british|Year|10|11|science|physics_radioactivity|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|comprehension_literal|passage reading|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|comprehension_inference|passage reading|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|literature_elements_theme|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|literature_elements_character|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|literature_devices_imagery|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|writing_purpose_argumentative|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|grammar_sentence_structure_complex|none|gcse"
"uk_national|UK GCSE|british|Year|10|11|english|vocabulary_greek_latin_roots|word builder|gcse"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  EXAM MODE: WAEC/WASSCE (SS 1-3) — exam_tag: waec               ║
# ╚═══════════════════════════════════════════════════════════════════╝
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|quadratic_equations|quadratic graph|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|simultaneous_equations|coordinate graph|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|trigonometry|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|statistics|data table|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|probability|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|vectors|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|number_indices|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|number_logarithms|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|number_surds|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|mathematics|circle_theorems|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|physics|physics_forces_newton_laws|force diagram|waec"
"ng_sss|WAEC Prep|british|SS|1|3|physics|physics_motion_velocity|velocity visual|waec"
"ng_sss|WAEC Prep|british|SS|1|3|physics|physics_waves_sound|wave diagram|waec"
"ng_sss|WAEC Prep|british|SS|1|3|physics|physics_electricity_circuits|circuit diagram|waec"
"ng_sss|WAEC Prep|british|SS|1|3|physics|physics_energy_forms|energy stores|waec"
"ng_sss|WAEC Prep|british|SS|1|3|chemistry|chemistry_atoms_elements|atom model|waec"
"ng_sss|WAEC Prep|british|SS|1|3|chemistry|chemistry_periodic_table|periodic table|waec"
"ng_sss|WAEC Prep|british|SS|1|3|chemistry|chemistry_acids_bases|pH scale|waec"
"ng_sss|WAEC Prep|british|SS|1|3|chemistry|chemistry_chemical_reactions|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|chemistry|chemistry_organic_hydrocarbons|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|biology|biology_cell_structure|cell diagram|waec"
"ng_sss|WAEC Prep|british|SS|1|3|biology|biology_genetics_inheritance|Punnett square|waec"
"ng_sss|WAEC Prep|british|SS|1|3|biology|biology_ecology_food_chains_webs|food chain|waec"
"ng_sss|WAEC Prep|british|SS|1|3|biology|biology_photosynthesis|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|biology|biology_evolution_natural_selection|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|english|comprehension_literal|passage reading|waec"
"ng_sss|WAEC Prep|british|SS|1|3|english|comprehension_inference|passage reading|waec"
"ng_sss|WAEC Prep|british|SS|1|3|english|comprehension_vocabulary|passage reading|waec"
"ng_sss|WAEC Prep|british|SS|1|3|english|grammar_active_passive_voice|grammar visual|waec"
"ng_sss|WAEC Prep|british|SS|1|3|english|literature_devices_imagery|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|commerce|trade_and_commerce|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|commerce|supply_demand|supply demand graph|waec"
"ng_sss|WAEC Prep|british|SS|1|3|economics|economics_supply_demand|supply demand graph|waec"
"ng_sss|WAEC Prep|british|SS|1|3|economics|economics_inflation|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|government|government_branches|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|civic_education|human_rights|passage reading|waec"
"ng_sss|WAEC Prep|british|SS|1|3|civic_education|nigerian_constitution|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|geography|geography_climate_zones|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|geography|geography_population_distribution|none|waec"
"ng_sss|WAEC Prep|british|SS|1|3|accounting|accounting_ledgers|T-account visual|waec"

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  EXAM MODE: NECO/SSCE (SS 1-3) — exam_tag: neco                 ║
# ╚═══════════════════════════════════════════════════════════════════╝
"ng_sss|NECO Prep|british|SS|1|3|mathematics|quadratic_equations|quadratic graph|neco"
"ng_sss|NECO Prep|british|SS|1|3|mathematics|simultaneous_equations|coordinate graph|neco"
"ng_sss|NECO Prep|british|SS|1|3|mathematics|trigonometry|none|neco"
"ng_sss|NECO Prep|british|SS|1|3|mathematics|statistics|data table|neco"
"ng_sss|NECO Prep|british|SS|1|3|mathematics|number_indices|none|neco"
"ng_sss|NECO Prep|british|SS|1|3|physics|physics_forces_newton_laws|force diagram|neco"
"ng_sss|NECO Prep|british|SS|1|3|physics|physics_electricity_circuits|circuit diagram|neco"
"ng_sss|NECO Prep|british|SS|1|3|physics|physics_waves_sound|wave diagram|neco"
"ng_sss|NECO Prep|british|SS|1|3|chemistry|chemistry_atoms_elements|atom model|neco"
"ng_sss|NECO Prep|british|SS|1|3|chemistry|chemistry_acids_bases|pH scale|neco"
"ng_sss|NECO Prep|british|SS|1|3|biology|biology_cell_structure|cell diagram|neco"
"ng_sss|NECO Prep|british|SS|1|3|biology|biology_genetics_inheritance|Punnett square|neco"
"ng_sss|NECO Prep|british|SS|1|3|english|comprehension_literal|passage reading|neco"
"ng_sss|NECO Prep|british|SS|1|3|english|comprehension_inference|passage reading|neco"
"ng_sss|NECO Prep|british|SS|1|3|english|grammar_active_passive_voice|grammar visual|neco"
)

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ═══════════════════════════════════════════════════════════════════════════════
total_entries=${#SHOWCASE[@]}
log "Total entries: ${total_entries}"

idx=0
for entry in "${SHOWCASE[@]}"; do
  idx=$((idx+1))
  IFS='|' read -r curriculum name spelling grade year_start year_end subject topic visual_hint exam_tag <<< "$entry"
  exam_tag="${exam_tag:-}"

  for year in $(seq "$year_start" "$year_end"); do
    existing=$(count_existing "$curriculum" "$subject" "$year" "$topic")
    needed=$((TARGET_MIN - existing))
    [ "$needed" -le 0 ] && continue

    log "[${idx}/${total_entries}] ${name} ${grade}${year} | ${subject}/${topic}${exam_tag:+ [${exam_tag}]}: need ${needed}"
    batches=$((( needed + BATCH_SIZE - 1 ) / BATCH_SIZE))
    for b in $(seq 1 "$batches"); do
      generate_batch "$curriculum" "$name" "$spelling" "$grade" "$subject" "$topic" "$year" "${visual_hint:-none}" "${exam_tag:-}" || FAILED=$((FAILED+BATCH_SIZE))
      sleep 0.2
    done
  done
done

log ""
log "═══════════════════════════════════════════════════════════"
log "  SHOWCASE COMPLETE"
log "  Inserted:   $INSERTED"
log "  Failed:     $FAILED"
log "  Skipped:    $SKIPPED"
log "  Log:        $LOGFILE"
log "═══════════════════════════════════════════════════════════"
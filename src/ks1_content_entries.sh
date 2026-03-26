#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# ks1_backfill.sh — KS1 Content for ALL UK National Curriculum subjects
# ═══════════════════════════════════════════════════════════════════════════════
# Run: OPENROUTER_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... ./ks1_backfill.sh

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
LOGFILE="ks1_backfill_$(date +%Y%m%d_%H%M%S).log"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOGFILE"; }

log "═══ KS1 BACKFILL — All UK National subjects Y1-2 ═══"
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
  local j="$1"
  local qt ol av et
  qt=$(echo "$j"|jq -r '.q//"''"'); ol=$(echo "$j"|jq '.opts|length//0'); av=$(echo "$j"|jq '.a//-1'); et=$(echo "$j"|jq -r '.exp//"''"')
  [ ${#qt} -lt 15 ]&&echo "F"&&return; [ "$ol" -ne 4 ]&&echo "F"&&return
  [ "$av" -lt 0 ]||[ "$av" -gt 3 ]&&echo "F"&&return; [ ${#et} -lt 25 ]&&echo "F"&&return
  if echo "$et" | grep -qiE 'needs revision|needs correction|is incorrect|should be.*not|however.*correct.*should|adjusting|question needs|this is wrong'; then
    echo "F"; return
  fi
  local uo; uo=$(echo "$j"|jq '[.opts[]|tostring|ascii_downcase|gsub("^\\s+|\\s+$";"")]|unique|length' 2>/dev/null || echo "0")
  [ "$uo" -lt 4 ]&&echo "F"&&return; echo "OK"
}

generate_batch() {
  local cur="$1" nm="$2" sp="$3" gr="$4" sub="$5" top="$6" yr="$7" vh="$8" etag="${9:-}"
  local cm="${MODELS[$MODEL_IDX]}"; MODEL_IDX=$(((MODEL_IDX+1)%MODEL_COUNT))
  local sd="${sub//_/ }" td="${top//_/ }"

  local dg
  local banned_concepts=""
  if [ "$yr" -le 2 ]; then
    dg="Foundation: single-step, basic vocabulary, ages 5-7. Use ONLY numbers up to 20. Use concrete objects (apples, sweets, toys). No abstract concepts. No multi-digit arithmetic. No fractions, decimals, percentages, algebra, or geometry beyond simple 2D shapes."
    banned_concepts="fraction|decimal|percent|algebra|equation|multiply|divide|times table|perimeter|area|volume|angle|coordinate|negative|ratio|proportion|probability|statistics|place.value.thousands"
  else
    dg="Developing: two-step, age 7-9."
  fi

  local vi=""
  [ "$vh" != "none" ]&&[ -n "$vh" ]&&vi="IMPORTANT: A ${vh} will be shown alongside these questions. Write questions that REFERENCE the visual — e.g. 'Look at the diagram...', 'The chart shows...'. Include specific numbers the visual parser can extract."

  local sp_full="You are an expert ${nm} question writer (${sp} English).
Write ${BATCH_SIZE} MCQs for ${gr} ${yr} on ${sd}: '${td}'.
${vi}
RULES:
1. 4 unique options each, exactly 1 correct. Randomise correct index (0-3).
2. VERIFY YOUR ANSWER: Before finalising each question, mentally solve it yourself. The option at index 'a' MUST be the correct answer.
3. The explanation MUST show the working that arrives at the correct option.
4. NEVER write 'the question needs revision' or 'this is incorrect' in an explanation.
5. Explanation ≥40 chars teaching WHY the answer is correct.
6. No 'none of the above' or 'all of the above'.
7. For number bonds: ALWAYS use fill-the-blank format like '3 + ___ = 10' or 'How many more do I need to make 10?' — NEVER 'What two numbers make X?' (multiple valid answers).
8. ${sp} spelling. ${dg}
Return ONLY JSON array: [{\"q\":\"...\",\"opts\":[...],\"a\":N,\"exp\":\"...\"}]"

  local resp ct
  resp=$(curl -s --max-time 90 "${OPENROUTER_URL}" \
    -H "Content-Type: application/json" -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
    -H "HTTP-Referer: https://launchpard.com" -H "X-Title: LaunchPard-KS1" \
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
    [ "$(validate_q "$qj")" != "OK" ]&&SKIPPED=$((SKIPPED+1))&&continue
    # Year-level guardrail: reject questions containing banned concepts
    if [ -n "$banned_concepts" ]; then
      local qtxt=$(echo "$qj"|jq -r '.q + " " + .exp')
      if echo "$qtxt" | grep -qiE "$banned_concepts"; then
        SKIPPED=$((SKIPPED+1)); continue
      fi
    fi
    # Number bond guardrail
    if echo "$top" | grep -qi "number_bond"; then
      local qtxt2=$(echo "$qj"|jq -r '.q')
      if echo "$qtxt2" | grep -qiE 'what two numbers|which two numbers|numbers make|add up to|combine to make|numbers together'; then
        SKIPPED=$((SKIPPED+1)); continue
      fi
    fi
    [ "$DRY_RUN" = "1" ]&&ib=$((ib+1))&&INSERTED=$((INSERTED+1))&&continue
    local qt qe ai o0 o1 o2 o3 dt
    qt=$(echo "$qj"|jq -r '.q'); qe=$(echo "$qj"|jq -r '.exp'); ai=$(echo "$qj"|jq '.a')
    o0=$(echo "$qj"|jq -r '.opts[0]'); o1=$(echo "$qj"|jq -r '.opts[1]')
    o2=$(echo "$qj"|jq -r '.opts[2]'); o3=$(echo "$qj"|jq -r '.opts[3]')
    dt="foundation"
    local hc
    hc=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_REST}/question_bank" \
      -H "apikey: ${SUPABASE_SERVICE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
      -H "Content-Type: application/json" -H "Prefer: return=minimal" \
      -d "$(jq -n --arg qt "$qt" --arg sub "$sub" --arg cur "$cur" --argjson yr "$yr" --arg top "$top" \
        --arg exp "$qe" --argjson ai "$ai" --arg o0 "$o0" --arg o1 "$o1" --arg o2 "$o2" --arg o3 "$o3" \
        --arg dt "$dt" \
        '{question_text:$qt,subject:$sub,curriculum:$cur,year_level:$yr,topic:$top,explanation:$exp,
          correct_index:$ai,options:[$o0,$o1,$o2,$o3],difficulty_tier:$dt,question_type:"mcq",source:"ai",is_active:true}')")
    [ "$hc" = "201" ]&&ib=$((ib+1))&&INSERTED=$((INSERTED+1))||FAILED=$((FAILED+1))
  done
  [ "$ib" -gt 0 ]&&log "    +${ib} [${cm##*/}] (${td})"
}

# ═══════════════════════════════════════════════════════════════════════════════
# KS1 TOPICS — All UK National Curriculum subjects, Years 1-2
# ═══════════════════════════════════════════════════════════════════════════════

SHOWCASE=(
# Science Y1-2
"uk_national|UK National|british|Year|1|2|science|plants_growth|none|"
"uk_national|UK National|british|Year|1|2|science|plants_what_they_need|none|"
"uk_national|UK National|british|Year|1|2|science|animals_classification|none|"
"uk_national|UK National|british|Year|1|2|science|animals_basic_needs|none|"
"uk_national|UK National|british|Year|1|2|science|human_body_parts|none|"
"uk_national|UK National|british|Year|1|2|science|human_body_senses|none|"
"uk_national|UK National|british|Year|1|2|science|materials_properties|none|"
"uk_national|UK National|british|Year|1|2|science|seasons_weather|none|"
"uk_national|UK National|british|Year|1|2|science|living_things_habitats|none|"
"uk_national|UK National|british|Year|1|2|science|food_and_nutrition|none|"

# History Y1-2
"uk_national|UK National|british|Year|1|2|history|changes_in_living_memory|none|"
"uk_national|UK National|british|Year|1|2|history|significant_people|none|"
"uk_national|UK National|british|Year|1|2|history|events_beyond_living_memory|none|"
"uk_national|UK National|british|Year|1|2|history|local_history|none|"

# Geography Y1-2
"uk_national|UK National|british|Year|1|2|geography|continents_and_oceans|none|"
"uk_national|UK National|british|Year|1|2|geography|weather_and_seasons|none|"
"uk_national|UK National|british|Year|1|2|geography|local_area|none|"
"uk_national|UK National|british|Year|1|2|geography|countries_of_uk|none|"

# Computing Y1-2
"uk_national|UK National|british|Year|1|2|computing|algorithms_and_instructions|none|"
"uk_national|UK National|british|Year|1|2|computing|using_technology_safely|none|"
"uk_national|UK National|british|Year|1|2|computing|creating_digital_content|none|"

# Design & Technology Y1-2
"uk_national|UK National|british|Year|1|2|design_and_technology|designing_and_making|none|"
"uk_national|UK National|british|Year|1|2|design_and_technology|structures|none|"
"uk_national|UK National|british|Year|1|2|design_and_technology|food_and_cooking|none|"

# Religious Education Y1-2
"uk_national|UK National|british|Year|1|2|religious_education|celebrations_and_festivals|none|"
"uk_national|UK National|british|Year|1|2|religious_education|religious_stories|none|"
"uk_national|UK National|british|Year|1|2|religious_education|places_of_worship|none|"

# English Y1-2
"uk_national|UK National|british|Year|1|2|english|phonics|none|"
"uk_national|UK National|british|Year|1|2|english|spelling_common_exception_words|none|"
"uk_national|UK National|british|Year|1|2|english|punctuation_capital_letters|none|"
"uk_national|UK National|british|Year|1|2|english|punctuation_full_stops|none|"
"uk_national|UK National|british|Year|1|2|english|grammar_nouns|none|"
"uk_national|UK National|british|Year|1|2|english|grammar_verbs|none|"
"uk_national|UK National|british|Year|1|2|english|grammar_adjectives|none|"
"uk_national|UK National|british|Year|1|2|english|comprehension_literal|passage reading|"
"uk_national|UK National|british|Year|1|2|english|vocabulary_synonyms|none|"
"uk_national|UK National|british|Year|1|2|english|sentence_structure_simple|none|"

# Maths Y1
"uk_national|UK National|british|Year|1|1|mathematics|counting_objects|counting dots visual|"
"uk_national|UK National|british|Year|1|1|mathematics|number_bonds_to_10|number bond diagram|"
"uk_national|UK National|british|Year|1|1|mathematics|number_bonds_to_20|number bond diagram|"
"uk_national|UK National|british|Year|1|1|mathematics|addition_within_10|addition dots visual|"
"uk_national|UK National|british|Year|1|1|mathematics|addition_within_20|addition dots visual|"
"uk_national|UK National|british|Year|1|1|mathematics|subtraction_within_10|subtraction visual|"
"uk_national|UK National|british|Year|1|1|mathematics|subtraction_within_20|subtraction visual|"
"uk_national|UK National|british|Year|1|1|mathematics|shapes_2d|none|"
"uk_national|UK National|british|Year|1|1|mathematics|telling_time_hours|clock face visual|"
"uk_national|UK National|british|Year|1|1|mathematics|ordering_numbers|number line visual|"

# Maths Y2
"uk_national|UK National|british|Year|2|2|mathematics|multiplication_tables_facts|multiplication grid|"
"uk_national|UK National|british|Year|2|2|mathematics|division_facts|division visual|"
"uk_national|UK National|british|Year|2|2|mathematics|fractions_identifying|fraction circle|"
"uk_national|UK National|british|Year|2|2|mathematics|place_value_tens_ones|place value chart|"
"uk_national|UK National|british|Year|2|2|mathematics|money_counting|coin visual|"
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

    log "[${idx}/${total_entries}] ${name} ${grade}${year} | ${subject}/${topic}: need ${needed}"
    batches=$((( needed + BATCH_SIZE - 1 ) / BATCH_SIZE))
    for b in $(seq 1 "$batches"); do
      generate_batch "$curriculum" "$name" "$spelling" "$grade" "$subject" "$topic" "$year" "${visual_hint:-none}" "${exam_tag:-}" || FAILED=$((FAILED+BATCH_SIZE))
      sleep 0.2
    done
  done
done

log ""
log "═══════════════════════════════════════════════════════════"
log "  KS1 BACKFILL COMPLETE"
log "  Inserted:   $INSERTED"
log "  Failed:     $FAILED"
log "  Skipped:    $SKIPPED"
log "  Log:        $LOGFILE"
log "═══════════════════════════════════════════════════════════"
-- ============================================================
-- Intersel Insight - Survey Engine
-- Demo Seed V2
-- Compatible with: 001_initial_base_survey.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. CLEANUP DEL DEMO (permite re-ejecutar este seed)
-- survey_observations usa ON DELETE RESTRICT hacia la versión,
-- por lo que eliminamos primero las observaciones del demo.
-- ------------------------------------------------------------
DELETE FROM intersel_insight.survey_observations o
USING intersel_insight.survey_instrument_versions iv,
      intersel_insight.survey_instruments i,
      intersel_insight.survey_studies s
WHERE o.instrument_version_id = iv.id
  AND iv.instrument_id = i.id
  AND i.study_id = s.id
  AND s.code = 'DEMO_CIUDADANA';

DELETE FROM intersel_insight.survey_studies
WHERE code = 'DEMO_CIUDADANA';

DO $$
DECLARE
    -- Jerarquía
    v_study uuid;
    v_instrument uuid;
    v_version uuid;

    -- Secciones
    sec_demo uuid;
    sec_perception uuid;
    sec_problems uuid;
    sec_discrimination uuid;
    sec_opinion uuid;

    -- Preguntas
    q_age uuid;
    q_gender uuid;
    q_satisfaction uuid;
    q_problems uuid;
    q_other_problem uuid;
    q_discrimination uuid;
    q_discrimination_reasons uuid;
    q_transport uuid;
    q_opinion uuid;

    -- Variables
    var_age uuid;
    var_gender uuid;
    var_satisfaction uuid;
    var_problems uuid;
    var_other_problem uuid;
    var_discrimination uuid;
    var_discrimination_reasons uuid;
    var_transport uuid;
    var_opinion uuid;

    -- Género
    opt_gender_male uuid;
    opt_gender_female uuid;
    opt_gender_other uuid;
    opt_gender_refused uuid;

    -- Problemas
    opt_problem_security uuid;
    opt_problem_water uuid;
    opt_problem_streets uuid;
    opt_problem_transport uuid;
    opt_problem_employment uuid;
    opt_problem_corruption uuid;
    opt_problem_other uuid;

    -- Discriminación
    opt_disc_yes uuid;
    opt_disc_no uuid;

    -- Motivos de discriminación
    opt_reason_age uuid;
    opt_reason_gender uuid;
    opt_reason_appearance uuid;
    opt_reason_income uuid;
    opt_reason_disability uuid;
    opt_reason_other uuid;

    -- Variables de trabajo del loop
    i integer;
    v_obs uuid;
    v_response uuid;
    v_age integer;
    v_sat integer;
    v_transport numeric;
    v_gender_option uuid;
    v_gender_raw text;
    v_has_disc boolean;
    v_disc_option uuid;
    v_has_other_problem boolean;
    v_other_problem_text text;
BEGIN
    -- ========================================================
    -- 1. ESTUDIO / INSTRUMENTO / VERSIÓN
    -- ========================================================
    INSERT INTO intersel_insight.survey_studies
        (code, name, description, organization, metadata)
    VALUES
        ('DEMO_CIUDADANA',
         'Estudio Demo Ciudadano',
         'Estudio sintético para validar el motor universal de encuestas de Intersel Insight.',
         'Intersel',
         '{"purpose":"survey_engine_validation","synthetic":true}'::jsonb)
    RETURNING id INTO v_study;

    INSERT INTO intersel_insight.survey_instruments
        (study_id, code, name, description, instrument_type, metadata)
    VALUES
        (v_study,
         'ENCUESTA_CIUDADANA',
         'Encuesta Demo Ciudadana',
         'Instrumento de prueba con captura numérica, categórica, ranking, multiselección, lógica condicional y texto abierto.',
         'survey',
         '{"synthetic":true}'::jsonb)
    RETURNING id INTO v_instrument;

    INSERT INTO intersel_insight.survey_instrument_versions
        (instrument_id, version, name, status, valid_from, published_at, metadata)
    VALUES
        (v_instrument,
         '1.0',
         'Encuesta Demo Ciudadana V1',
         'published',
         CURRENT_DATE,
         now(),
         '{"demo":true}'::jsonb)
    RETURNING id INTO v_version;

    -- ========================================================
    -- 2. SECCIONES
    -- ========================================================
    INSERT INTO intersel_insight.survey_sections
        (instrument_version_id, code, title, position)
    VALUES (v_version, 'DEMOGRAFIA', 'Datos demográficos', 1)
    RETURNING id INTO sec_demo;

    INSERT INTO intersel_insight.survey_sections
        (instrument_version_id, code, title, position)
    VALUES (v_version, 'PERCEPCION', 'Percepción ciudadana', 2)
    RETURNING id INTO sec_perception;

    INSERT INTO intersel_insight.survey_sections
        (instrument_version_id, code, title, position)
    VALUES (v_version, 'PROBLEMAS', 'Problemática de la ciudad', 3)
    RETURNING id INTO sec_problems;

    INSERT INTO intersel_insight.survey_sections
        (instrument_version_id, code, title, position)
    VALUES (v_version, 'DISCRIMINACION', 'Discriminación', 4)
    RETURNING id INTO sec_discrimination;

    INSERT INTO intersel_insight.survey_sections
        (instrument_version_id, code, title, position)
    VALUES (v_version, 'OPINION', 'Economía y opinión abierta', 5)
    RETURNING id INTO sec_opinion;

    -- ========================================================
    -- 3. P01 - EDAD
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type,
         position, required, metadata)
    VALUES
        (v_version, sec_demo, 'P01', '¿Cuántos años tiene?', 'number',
         1, true, '{"min":18,"max":100}'::jsonb)
    RETURNING id INTO q_age;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level, unit)
    VALUES
        (q_age, 'edad', 'Edad del participante', 'integer', 'ratio', 'years')
    RETURNING id INTO var_age;

    -- ========================================================
    -- 4. P02 - GÉNERO
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type,
         position, required)
    VALUES
        (v_version, sec_demo, 'P02', '¿Con qué género se identifica?',
         'single_choice', 2, true)
    RETURNING id INTO q_gender;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level)
    VALUES
        (q_gender, 'genero', 'Género', 'categorical', 'nominal')
    RETURNING id INTO var_gender;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_gender, 'M', '1', 'Hombre', 1)
    RETURNING id INTO opt_gender_male;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_gender, 'F', '2', 'Mujer', 2)
    RETURNING id INTO opt_gender_female;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_gender, 'O', '3', 'Otro', 3)
    RETURNING id INTO opt_gender_other;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position, is_missing, missing_type)
    VALUES (q_gender, 'NR', '99', 'Prefiero no responder', 4, true, 'refused')
    RETURNING id INTO opt_gender_refused;

    -- ========================================================
    -- 5. P03 - SATISFACCIÓN 1..5
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type,
         position, required, metadata)
    VALUES
        (v_version, sec_perception, 'P03',
         'En una escala del 1 al 5, ¿qué tan satisfecho está con su ciudad?',
         'scale', 1, true, '{"min":1,"max":5}'::jsonb)
    RETURNING id INTO q_satisfaction;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level)
    VALUES
        (q_satisfaction, 'satisfaccion_ciudad',
         'Satisfacción con la ciudad', 'integer', 'ordinal')
    RETURNING id INTO var_satisfaction;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES
        (q_satisfaction, '1', '1', 'Nada satisfecho', 1),
        (q_satisfaction, '2', '2', 'Poco satisfecho', 2),
        (q_satisfaction, '3', '3', 'Neutral', 3),
        (q_satisfaction, '4', '4', 'Satisfecho', 4),
        (q_satisfaction, '5', '5', 'Muy satisfecho', 5);

    -- ========================================================
    -- 6. P04 - RANKING DE 3 PROBLEMAS
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type,
         position, required, min_answers, max_answers)
    VALUES
        (v_version, sec_problems, 'P04',
         '¿Cuáles considera los tres principales problemas de su ciudad?',
         'ranking', 1, true, 3, 3)
    RETURNING id INTO q_problems;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level)
    VALUES
        (q_problems, 'principales_problemas',
         'Principales problemas de la ciudad', 'categorical', 'nominal')
    RETURNING id INTO var_problems;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_problems, 'SEG', '1', 'Inseguridad', 1)
    RETURNING id INTO opt_problem_security;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_problems, 'AGUA', '2', 'Agua', 2)
    RETURNING id INTO opt_problem_water;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_problems, 'CALLES', '3', 'Calles y pavimentación', 3)
    RETURNING id INTO opt_problem_streets;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_problems, 'TRANS', '4', 'Transporte público', 4)
    RETURNING id INTO opt_problem_transport;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_problems, 'EMPLEO', '5', 'Empleo', 5)
    RETURNING id INTO opt_problem_employment;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_problems, 'CORR', '6', 'Corrupción', 6)
    RETURNING id INTO opt_problem_corruption;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_problems, 'OTRO', '7', 'Otro', 7)
    RETURNING id INTO opt_problem_other;

    -- ========================================================
    -- 7. P05 - OTRO PROBLEMA (CONDICIONAL)
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type, position)
    VALUES
        (v_version, sec_problems, 'P05',
         '¿Cuál otro problema considera importante?', 'text', 2)
    RETURNING id INTO q_other_problem;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level)
    VALUES
        (q_other_problem, 'otro_problema',
         'Otro problema mencionado', 'text', 'nominal')
    RETURNING id INTO var_other_problem;

    -- ========================================================
    -- 8. P06 - DISCRIMINACIÓN
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type,
         position, required)
    VALUES
        (v_version, sec_discrimination, 'P06',
         '¿Ha sufrido discriminación durante los últimos 12 meses?',
         'single_choice', 1, true)
    RETURNING id INTO q_discrimination;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level)
    VALUES
        (q_discrimination, 'sufrio_discriminacion',
         'Sufrió discriminación', 'categorical', 'nominal')
    RETURNING id INTO var_discrimination;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination, 'SI', '1', 'Sí', 1)
    RETURNING id INTO opt_disc_yes;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination, 'NO', '0', 'No', 2)
    RETURNING id INTO opt_disc_no;

    -- ========================================================
    -- 9. P07 - MOTIVOS (MULTISELECT + CONDICIONAL)
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type,
         position, min_answers, max_answers)
    VALUES
        (v_version, sec_discrimination, 'P07',
         '¿Por cuál o cuáles motivos considera que sufrió discriminación?',
         'multiple_choice', 2, 1, 6)
    RETURNING id INTO q_discrimination_reasons;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level)
    VALUES
        (q_discrimination_reasons, 'motivos_discriminacion',
         'Motivos de discriminación', 'categorical', 'nominal')
    RETURNING id INTO var_discrimination_reasons;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination_reasons, 'EDAD', '1', 'Edad', 1)
    RETURNING id INTO opt_reason_age;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination_reasons, 'GENERO', '2', 'Género', 2)
    RETURNING id INTO opt_reason_gender;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination_reasons, 'APAR', '3', 'Apariencia física', 3)
    RETURNING id INTO opt_reason_appearance;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination_reasons, 'INGRESO', '4', 'Situación económica', 4)
    RETURNING id INTO opt_reason_income;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination_reasons, 'DISC', '5', 'Discapacidad', 5)
    RETURNING id INTO opt_reason_disability;

    INSERT INTO intersel_insight.survey_answer_options
        (question_id, code, value, label, position)
    VALUES (q_discrimination_reasons, 'OTRO', '6', 'Otro', 6)
    RETURNING id INTO opt_reason_other;

    -- ========================================================
    -- 10. P08 - GASTO SEMANAL EN TRANSPORTE
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type,
         position, metadata)
    VALUES
        (v_version, sec_opinion, 'P08',
         '¿Cuánto gasta aproximadamente por semana en transporte?',
         'number', 1, '{"min":0}'::jsonb)
    RETURNING id INTO q_transport;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level,
         unit, decimal_places)
    VALUES
        (q_transport, 'gasto_transporte_semanal',
         'Gasto semanal en transporte', 'decimal', 'ratio', 'MXN', 2)
    RETURNING id INTO var_transport;

    -- ========================================================
    -- 11. P09 - OPINIÓN ABIERTA
    -- ========================================================
    INSERT INTO intersel_insight.survey_questions
        (instrument_version_id, section_id, code, text, question_type, position)
    VALUES
        (v_version, sec_opinion, 'P09',
         'En sus propias palabras, ¿qué debería mejorar primero la ciudad?',
         'textarea', 2)
    RETURNING id INTO q_opinion;

    INSERT INTO intersel_insight.survey_variables
        (question_id, code, label, data_type, measurement_level)
    VALUES
        (q_opinion, 'opinion_mejora_ciudad',
         'Opinión abierta sobre mejoras de la ciudad', 'text', 'nominal')
    RETURNING id INTO var_opinion;

    -- ========================================================
    -- 12. REGLAS CONDICIONALES
    -- ========================================================
    INSERT INTO intersel_insight.survey_logic_rules
        (instrument_version_id, source_question_id, operator,
         comparison_value, target_type, target_id, action, priority)
    VALUES
        (v_version, q_problems, 'contains',
         jsonb_build_object('answer_option_id', opt_problem_other),
         'question', q_other_problem, 'show', 1),
        (v_version, q_discrimination, 'equals',
         jsonb_build_object('answer_option_id', opt_disc_yes),
         'question', q_discrimination_reasons, 'show', 1);

    -- ========================================================
    -- 13. 20 OBSERVACIONES SINTÉTICAS
    -- ========================================================
    FOR i IN 1..20 LOOP
        v_age := 18 + ((i * 7) % 55);
        v_sat := 1 + ((i * 3) % 5);
        v_transport := 150 + ((i * 137) % 850);
        v_has_disc := (i % 4 = 0 OR i % 7 = 0);

        -- 2 casos missing/refused, 1 caso "Otro", resto Hombre/Mujer.
        IF i % 10 = 0 THEN
            v_gender_option := opt_gender_refused;
            v_gender_raw := '99';
        ELSIF i = 15 THEN
            v_gender_option := opt_gender_other;
            v_gender_raw := '3';
        ELSIF i % 2 = 0 THEN
            v_gender_option := opt_gender_female;
            v_gender_raw := '2';
        ELSE
            v_gender_option := opt_gender_male;
            v_gender_raw := '1';
        END IF;

        IF v_has_disc THEN
            v_disc_option := opt_disc_yes;
        ELSE
            v_disc_option := opt_disc_no;
        END IF;

        INSERT INTO intersel_insight.survey_observations
            (instrument_version_id, external_id, started_at, completed_at,
             status, weight, context, metadata)
        VALUES
            (v_version,
             'DEMO-' || lpad(i::text, 4, '0'),
             now() - interval '30 minutes',
             now(),
             'completed',
             1 + ((i % 3) * 0.05),
             jsonb_build_object('source', 'synthetic_seed_v2', 'demo_row', i),
             '{"synthetic":true}'::jsonb)
        RETURNING id INTO v_obs;

        -- Guardas defensivas: si alguna referencia crítica no existe,
        -- abortamos toda la transacción con un error claro.
        IF v_obs IS NULL THEN
            RAISE EXCEPTION 'No se creó observation para i=%', i;
        END IF;

        IF var_age IS NULL OR var_gender IS NULL OR var_satisfaction IS NULL
           OR var_problems IS NULL OR var_discrimination IS NULL
           OR var_transport IS NULL OR var_opinion IS NULL THEN
            RAISE EXCEPTION 'Hay una variable de encuesta NULL antes de insertar respuestas';
        END IF;

        -- P01 Edad
        INSERT INTO intersel_insight.survey_responses
            (observation_id, variable_id, raw_value, value_integer)
        VALUES (v_obs, var_age, v_age::text, v_age);

        -- P02 Género
        INSERT INTO intersel_insight.survey_responses
            (observation_id, variable_id, raw_value, answer_option_id,
             is_missing, missing_type)
        VALUES
            (v_obs, var_gender, v_gender_raw, v_gender_option,
             v_gender_option = opt_gender_refused,
             CASE WHEN v_gender_option = opt_gender_refused THEN 'refused' ELSE NULL END);

        -- P03 Satisfacción
        INSERT INTO intersel_insight.survey_responses
            (observation_id, variable_id, raw_value, value_integer)
        VALUES (v_obs, var_satisfaction, v_sat::text, v_sat);

        -- P04 Ranking: primero creamos UNA respuesta padre.
        INSERT INTO intersel_insight.survey_responses
            (observation_id, variable_id)
        VALUES (v_obs, var_problems)
        RETURNING id INTO v_response;

        -- Seis patrones; dentro de cada patrón las 3 opciones son únicas.
        CASE i % 6
            WHEN 0 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id, rank)
                VALUES
                    (v_response, opt_problem_water, 1),
                    (v_response, opt_problem_security, 2),
                    (v_response, opt_problem_other, 3);
                v_has_other_problem := true;

            WHEN 1 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id, rank)
                VALUES
                    (v_response, opt_problem_security, 1),
                    (v_response, opt_problem_transport, 2),
                    (v_response, opt_problem_water, 3);
                v_has_other_problem := false;

            WHEN 2 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id, rank)
                VALUES
                    (v_response, opt_problem_streets, 1),
                    (v_response, opt_problem_employment, 2),
                    (v_response, opt_problem_corruption, 3);
                v_has_other_problem := false;

            WHEN 3 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id, rank)
                VALUES
                    (v_response, opt_problem_water, 1),
                    (v_response, opt_problem_corruption, 2),
                    (v_response, opt_problem_transport, 3);
                v_has_other_problem := false;

            WHEN 4 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id, rank)
                VALUES
                    (v_response, opt_problem_security, 1),
                    (v_response, opt_problem_streets, 2),
                    (v_response, opt_problem_employment, 3);
                v_has_other_problem := false;

            WHEN 5 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id, rank)
                VALUES
                    (v_response, opt_problem_streets, 1),
                    (v_response, opt_problem_water, 2),
                    (v_response, opt_problem_other, 3);
                v_has_other_problem := true;
        END CASE;

        -- P05 Sólo existe si P04 seleccionó "Otro".
        IF v_has_other_problem THEN
            v_other_problem_text :=
                CASE WHEN i % 2 = 0
                     THEN 'Contaminación'
                     ELSE 'Falta de áreas verdes'
                END;

            INSERT INTO intersel_insight.survey_responses
                (observation_id, variable_id, raw_value, value_text)
            VALUES
                (v_obs, var_other_problem,
                 v_other_problem_text, v_other_problem_text);
        END IF;

        -- P06 Discriminación
        INSERT INTO intersel_insight.survey_responses
            (observation_id, variable_id, raw_value, answer_option_id)
        VALUES
            (v_obs, var_discrimination,
             CASE WHEN v_has_disc THEN '1' ELSE '0' END,
             v_disc_option);

        -- P07 Sólo existe si P06 = Sí.
        IF v_has_disc THEN
            INSERT INTO intersel_insight.survey_responses
                (observation_id, variable_id)
            VALUES (v_obs, var_discrimination_reasons)
            RETURNING id INTO v_response;

            -- Primera razón (siempre una).
            INSERT INTO intersel_insight.survey_response_selections
                (response_id, answer_option_id)
            VALUES
                (v_response,
                 CASE i % 4
                    WHEN 0 THEN opt_reason_age
                    WHEN 1 THEN opt_reason_gender
                    WHEN 2 THEN opt_reason_appearance
                    ELSE opt_reason_disability
                 END);

            -- Segunda razón sólo en algunos casos; elegimos una opción
            -- que nunca coincide con la primera para respetar UNIQUE.
            IF i % 8 = 0 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id)
                VALUES (v_response, opt_reason_income);
            ELSIF i % 7 = 0 THEN
                INSERT INTO intersel_insight.survey_response_selections
                    (response_id, answer_option_id)
                VALUES (v_response, opt_reason_other);
            END IF;
        END IF;

        -- P08 Transporte
        INSERT INTO intersel_insight.survey_responses
            (observation_id, variable_id, raw_value, value_decimal)
        VALUES
            (v_obs, var_transport, v_transport::text, v_transport);

        -- P09 Opinión abierta
        INSERT INTO intersel_insight.survey_responses
            (observation_id, variable_id, raw_value, value_text)
        VALUES
            (v_obs, var_opinion,
             CASE i % 5
                WHEN 0 THEN 'Mejorar la seguridad en las colonias'
                WHEN 1 THEN 'Reparar calles y mejorar el pavimento'
                WHEN 2 THEN 'Resolver los problemas de agua'
                WHEN 3 THEN 'Mejorar el transporte público'
                ELSE 'Crear más oportunidades de empleo'
             END,
             CASE i % 5
                WHEN 0 THEN 'Mejorar la seguridad en las colonias'
                WHEN 1 THEN 'Reparar calles y mejorar el pavimento'
                WHEN 2 THEN 'Resolver los problemas de agua'
                WHEN 3 THEN 'Mejorar el transporte público'
                ELSE 'Crear más oportunidades de empleo'
             END);
    END LOOP;
END $$;

-- ============================================================
-- 14. VALIDACIONES AUTOMÁTICAS
-- Si alguna falla, aborta antes del COMMIT.
-- ============================================================
DO $$
DECLARE
    n_studies integer;
    n_instruments integer;
    n_versions integer;
    n_sections integer;
    n_questions integer;
    n_variables integer;
    n_observations integer;
    n_duplicate_rank_options integer;
    n_bad_other_problem integer;
BEGIN
    SELECT count(*) INTO n_studies
    FROM intersel_insight.survey_studies
    WHERE code = 'DEMO_CIUDADANA';

    SELECT count(*) INTO n_instruments
    FROM intersel_insight.survey_instruments i
    JOIN intersel_insight.survey_studies s ON s.id = i.study_id
    WHERE s.code = 'DEMO_CIUDADANA';

    SELECT count(*) INTO n_versions
    FROM intersel_insight.survey_instrument_versions iv
    JOIN intersel_insight.survey_instruments i ON i.id = iv.instrument_id
    JOIN intersel_insight.survey_studies s ON s.id = i.study_id
    WHERE s.code = 'DEMO_CIUDADANA';

    SELECT count(*) INTO n_sections
    FROM intersel_insight.survey_sections sec
    JOIN intersel_insight.survey_instrument_versions iv ON iv.id = sec.instrument_version_id
    JOIN intersel_insight.survey_instruments i ON i.id = iv.instrument_id
    JOIN intersel_insight.survey_studies s ON s.id = i.study_id
    WHERE s.code = 'DEMO_CIUDADANA';

    SELECT count(*) INTO n_questions
    FROM intersel_insight.survey_questions q
    JOIN intersel_insight.survey_instrument_versions iv ON iv.id = q.instrument_version_id
    JOIN intersel_insight.survey_instruments i ON i.id = iv.instrument_id
    JOIN intersel_insight.survey_studies s ON s.id = i.study_id
    WHERE s.code = 'DEMO_CIUDADANA';

    SELECT count(*) INTO n_variables
    FROM intersel_insight.survey_variables v
    JOIN intersel_insight.survey_questions q ON q.id = v.question_id
    JOIN intersel_insight.survey_instrument_versions iv ON iv.id = q.instrument_version_id
    JOIN intersel_insight.survey_instruments i ON i.id = iv.instrument_id
    JOIN intersel_insight.survey_studies s ON s.id = i.study_id
    WHERE s.code = 'DEMO_CIUDADANA';

    SELECT count(*) INTO n_observations
    FROM intersel_insight.survey_observations o
    JOIN intersel_insight.survey_instrument_versions iv ON iv.id = o.instrument_version_id
    JOIN intersel_insight.survey_instruments i ON i.id = iv.instrument_id
    JOIN intersel_insight.survey_studies s ON s.id = i.study_id
    WHERE s.code = 'DEMO_CIUDADANA';

    SELECT count(*) INTO n_duplicate_rank_options
    FROM (
        SELECT rs.response_id, rs.answer_option_id, count(*)
        FROM intersel_insight.survey_response_selections rs
        JOIN intersel_insight.survey_responses r ON r.id = rs.response_id
        JOIN intersel_insight.survey_variables v ON v.id = r.variable_id
        WHERE v.code = 'principales_problemas'
        GROUP BY rs.response_id, rs.answer_option_id
        HAVING count(*) > 1
    ) d;

    -- No debe existir P05 si P04 no contiene OTRO.
    SELECT count(*) INTO n_bad_other_problem
    FROM intersel_insight.survey_responses r_other
    JOIN intersel_insight.survey_variables v_other ON v_other.id = r_other.variable_id
    WHERE v_other.code = 'otro_problema'
      AND NOT EXISTS (
          SELECT 1
          FROM intersel_insight.survey_responses r_problem
          JOIN intersel_insight.survey_variables v_problem ON v_problem.id = r_problem.variable_id
          JOIN intersel_insight.survey_response_selections rs ON rs.response_id = r_problem.id
          JOIN intersel_insight.survey_answer_options ao ON ao.id = rs.answer_option_id
          WHERE r_problem.observation_id = r_other.observation_id
            AND v_problem.code = 'principales_problemas'
            AND ao.code = 'OTRO'
      );

    IF n_studies <> 1 OR n_instruments <> 1 OR n_versions <> 1
       OR n_sections <> 5 OR n_questions <> 9 OR n_variables <> 9
       OR n_observations <> 20 THEN
        RAISE EXCEPTION
            'Validación estructural falló: studies=%, instruments=%, versions=%, sections=%, questions=%, variables=%, observations=%',
            n_studies, n_instruments, n_versions, n_sections,
            n_questions, n_variables, n_observations;
    END IF;

    IF n_duplicate_rank_options <> 0 THEN
        RAISE EXCEPTION 'Hay % opciones duplicadas dentro de rankings', n_duplicate_rank_options;
    END IF;

    IF n_bad_other_problem <> 0 THEN
        RAISE EXCEPTION 'Hay % respuestas P05 sin que P04 contenga OTRO', n_bad_other_problem;
    END IF;
END $$;

COMMIT;

-- ============================================================
-- 15. RESUMEN FINAL (debe devolver 1 / 1 / 1 / 5 / 9 / 9 / 20)
-- ============================================================
SELECT
    s.code AS study,
    i.code AS instrument,
    iv.version,
    (SELECT count(*)
       FROM intersel_insight.survey_sections sec
      WHERE sec.instrument_version_id = iv.id) AS sections,
    (SELECT count(*)
       FROM intersel_insight.survey_questions q
      WHERE q.instrument_version_id = iv.id) AS questions,
    (SELECT count(*)
       FROM intersel_insight.survey_variables v
       JOIN intersel_insight.survey_questions q ON q.id = v.question_id
      WHERE q.instrument_version_id = iv.id) AS variables,
    (SELECT count(*)
       FROM intersel_insight.survey_observations o
      WHERE o.instrument_version_id = iv.id) AS observations
FROM intersel_insight.survey_studies s
JOIN intersel_insight.survey_instruments i ON i.study_id = s.id
JOIN intersel_insight.survey_instrument_versions iv ON iv.instrument_id = i.id
WHERE s.code = 'DEMO_CIUDADANA';

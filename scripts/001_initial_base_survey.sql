-- ============================================================
-- HCV / Survey Data Platform
-- Core Schema v1
-- PostgreSQL / Supabase
-- ============================================================

create extension if not exists pgcrypto;

create schema if not exists survey;

-- ============================================================
-- 1. STUDIES
-- Contenedor analítico/científico superior.
-- ============================================================

create table intersel_insight.survey_studies (
    id uuid primary key default gen_random_uuid(),

    code text not null unique,
    name text not null,
    description text,
    organization text,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. INSTRUMENTS
-- Instrumento conceptual perteneciente a un estudio.
-- ============================================================

create table intersel_insight.survey_instruments (
    id uuid primary key default gen_random_uuid(),

    study_id uuid not null
        references intersel_insight.survey_studies(id)
        on delete cascade,

    code text not null,
    name text not null,
    description text,

    instrument_type text not null default 'survey',

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (study_id, code)
);


-- ============================================================
-- 3. INSTRUMENT VERSIONS
-- Una versión inmutable/publicable de un instrumento.
-- ============================================================

create table intersel_insight.survey_instrument_versions (
    id uuid primary key default gen_random_uuid(),

    instrument_id uuid not null
        references intersel_insight.survey_instruments(id)
        on delete cascade,

    version text not null,
    name text,

    status text not null default 'draft'
        check (status in ('draft', 'published', 'closed', 'archived')),

    valid_from date,
    valid_to date,

    source_file text,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    published_at timestamptz,

    unique (instrument_id, version)
);


-- ============================================================
-- 4. SECTIONS
-- Estructura jerárquica del cuestionario.
-- ============================================================

create table intersel_insight.survey_sections (
    id uuid primary key default gen_random_uuid(),

    instrument_version_id uuid not null
        references intersel_insight.survey_instrument_versions(id)
        on delete cascade,

    parent_section_id uuid
        references intersel_insight.survey_sections(id)
        on delete cascade,

    code text not null,
    title text not null,
    description text,

    position integer not null default 0
        check (position >= 0),

    metadata jsonb not null default '{}'::jsonb,

    unique (instrument_version_id, code)
);


-- ============================================================
-- 5. QUESTIONS
-- Lo que se presenta conceptualmente al encuestado.
-- ============================================================

create table intersel_insight.survey_questions (
    id uuid primary key default gen_random_uuid(),

    instrument_version_id uuid not null
        references intersel_insight.survey_instrument_versions(id)
        on delete cascade,

    section_id uuid
        references intersel_insight.survey_sections(id)
        on delete set null,

    code text not null,

    text text not null,
    description text,

    question_type text not null,

    position integer not null default 0
        check (position >= 0),

    required boolean not null default false,

    min_answers integer,
    max_answers integer,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    unique (instrument_version_id, code),

    check (
        min_answers is null
        or min_answers >= 0
    ),

    check (
        max_answers is null
        or max_answers >= 0
    ),

    check (
        min_answers is null
        or max_answers is null
        or min_answers <= max_answers
    )
);


-- ============================================================
-- 6. VARIABLES
-- Representación analítica de los datos producidos.
-- Una pregunta puede generar una o varias variables.
-- ============================================================

create table intersel_insight.survey_variables (
    id uuid primary key default gen_random_uuid(),

    question_id uuid not null
        references intersel_insight.survey_questions(id)
        on delete cascade,

    code text not null,
    label text not null,

    data_type text not null,

    measurement_level text
        check (
            measurement_level is null
            or measurement_level in (
                'nominal',
                'ordinal',
                'interval',
                'ratio'
            )
        ),

    unit text,
    decimal_places integer,

    is_analysis_variable boolean not null default true,

    metadata jsonb not null default '{}'::jsonb,

    unique (question_id, code),

    check (
        decimal_places is null
        or decimal_places >= 0
    )
);


-- ============================================================
-- 7. ANSWER OPTIONS
-- Catálogos y categorías válidas.
-- ============================================================

create table intersel_insight.survey_answer_options (
    id uuid primary key default gen_random_uuid(),

    question_id uuid not null
        references intersel_insight.survey_questions(id)
        on delete cascade,

    code text not null,
    value text,
    label text not null,

    position integer not null default 0
        check (position >= 0),

    is_missing boolean not null default false,

    missing_type text,

    metadata jsonb not null default '{}'::jsonb,

    unique (question_id, code),

    check (
        is_missing = true
        or missing_type is null
    )
);


-- ============================================================
-- 8. LOGIC RULES
-- Saltos, visibilidad y requisitos condicionales.
-- ============================================================

create table intersel_insight.survey_logic_rules (
    id uuid primary key default gen_random_uuid(),

    instrument_version_id uuid not null
        references intersel_insight.survey_instrument_versions(id)
        on delete cascade,

    source_question_id uuid not null
        references intersel_insight.survey_questions(id)
        on delete cascade,

    operator text not null,

    comparison_value jsonb,

    target_type text not null,
    target_id uuid not null,

    action text not null,

    priority integer not null default 0,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 9. OBSERVATIONS
-- Una aplicación/caso/registro del instrumento.
-- ============================================================

create table intersel_insight.survey_observations (
    id uuid primary key default gen_random_uuid(),

    instrument_version_id uuid not null
        references intersel_insight.survey_instrument_versions(id)
        on delete restrict,

    external_id text,

    started_at timestamptz,
    completed_at timestamptz,

    status text not null default 'in_progress'
        check (
            status in (
                'in_progress',
                'completed',
                'partial',
                'rejected',
                'invalid'
            )
        ),

    -- Ponderador simple V1.
    -- Posteriormente puede migrar a observation_weights.
    weight numeric,

    context jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    unique (instrument_version_id, external_id),

    check (
        weight is null
        or weight >= 0
    ),

    check (
        completed_at is null
        or started_at is null
        or completed_at >= started_at
    )
);


-- ============================================================
-- 10. RESPONSES
-- Valor producido por una variable para una observación.
-- ============================================================

create table intersel_insight.survey_responses (
    id uuid primary key default gen_random_uuid(),

    observation_id uuid not null
        references intersel_insight.survey_observations(id)
        on delete cascade,

    variable_id uuid not null
        references intersel_insight.survey_variables(id)
        on delete restrict,

    -- Valor exacto recibido de la fuente.
    raw_value text,

    -- Representaciones normalizadas.
    value_text text,
    value_integer bigint,
    value_decimal numeric,
    value_boolean boolean,
    value_date date,
    value_datetime timestamptz,

    -- Para selección única.
    answer_option_id uuid
        references intersel_insight.survey_answer_options(id)
        on delete restrict,

    is_missing boolean not null default false,
    missing_type text,

    quality_status text not null default 'valid'
        check (
            quality_status in (
                'valid',
                'warning',
                'invalid',
                'unreviewed'
            )
        ),

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    unique (observation_id, variable_id),

    check (
        is_missing = true
        or missing_type is null
    )
);


-- ============================================================
-- 11. RESPONSE SELECTIONS
-- Multi-select y ranking.
-- ============================================================

create table intersel_insight.survey_response_selections (
    id uuid primary key default gen_random_uuid(),

    response_id uuid not null
        references intersel_insight.survey_responses(id)
        on delete cascade,

    answer_option_id uuid not null
        references intersel_insight.survey_answer_options(id)
        on delete restrict,

    rank integer,

    raw_value text,

    metadata jsonb not null default '{}'::jsonb,

    unique (response_id, answer_option_id),

    check (
        rank is null
        or rank > 0
    )
);


-- ============================================================
-- INDEXES
-- ============================================================

create index idx_instruments_study
    on intersel_insight.survey_instruments(study_id);

create index idx_versions_instrument
    on intersel_insight.survey_instrument_versions(instrument_id);

create index idx_sections_version
    on intersel_insight.survey_sections(instrument_version_id);

create index idx_questions_version
    on intersel_insight.survey_questions(instrument_version_id);

create index idx_questions_section
    on intersel_insight.survey_questions(section_id);

create index idx_variables_question
    on intersel_insight.survey_variables(question_id);

create index idx_options_question
    on intersel_insight.survey_answer_options(question_id);

create index idx_observations_version
    on intersel_insight.survey_observations(instrument_version_id);

create index idx_observations_status
    on intersel_insight.survey_observations(instrument_version_id, status);

create index idx_responses_observation
    on intersel_insight.survey_responses(observation_id);

create index idx_responses_variable
    on intersel_insight.survey_responses(variable_id);

create index idx_response_selections_response
    on intersel_insight.survey_response_selections(response_id);

create index idx_response_selections_option
    on intersel_insight.survey_response_selections(answer_option_id);
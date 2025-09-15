--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Debian 14.18-1.pgdg120+1)
-- Dumped by pg_dump version 14.18 (Debian 14.18-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: visit_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.visit_status AS ENUM (
    'UNCONFIRMED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'PAID'
);


ALTER TYPE public.visit_status OWNER TO "user";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO "user";

--
-- Name: client; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.client (
    phone_number text NOT NULL,
    date_of_birth date,
    name text NOT NULL,
    surname text NOT NULL,
    patronymic text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dt_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dt_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    full_name text NOT NULL
);


ALTER TABLE public.client OWNER TO "user";

--
-- Name: doctor; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.doctor (
    speciality text NOT NULL,
    name text NOT NULL,
    surname text NOT NULL,
    patronymic text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dt_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dt_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    full_name text NOT NULL
);


ALTER TABLE public.doctor OWNER TO "user";

--
-- Name: visit; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.visit (
    client_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    procedure text,
    cost double precision,
    status public.visit_status DEFAULT 'UNCONFIRMED'::public.visit_status NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dt_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dt_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    start_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_date timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '01:00:00'::interval) NOT NULL,
    cabinet text
);


ALTER TABLE public.visit OWNER TO "user";

--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: client pk__client; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT pk__client PRIMARY KEY (id);


--
-- Name: doctor pk__doctor; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.doctor
    ADD CONSTRAINT pk__doctor PRIMARY KEY (id);


--
-- Name: visit pk__visit; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT pk__visit PRIMARY KEY (id);


--
-- Name: client uq__client__id; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT uq__client__id UNIQUE (id);


--
-- Name: client uq__client__phone_number; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT uq__client__phone_number UNIQUE (phone_number);


--
-- Name: doctor uq__doctor__id; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.doctor
    ADD CONSTRAINT uq__doctor__id UNIQUE (id);


--
-- Name: visit uq__visit__id; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT uq__visit__id UNIQUE (id);


--
-- Name: visit fk__visit__client_id__client; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT fk__visit__client_id__client FOREIGN KEY (client_id) REFERENCES public.client(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: visit fk__visit__doctor_id__doctor; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT fk__visit__doctor_id__doctor FOREIGN KEY (doctor_id) REFERENCES public.doctor(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


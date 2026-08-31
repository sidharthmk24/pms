--
-- PostgreSQL database dump
--

\restrict mW0El3EVmwkKuMLaS5bBja5uHHB4BMiix58BCgFUYDij5MMhiMyMsW2GEYoYX3O

-- Dumped from database version 17.6 (Homebrew)
-- Dumped by pg_dump version 17.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: mm-developer01
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	1ca132ce0ca7b138f299adf63efce853179b6456615aad6a4380108a07a3d174	1786356087791
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.users (id, email, name, password_hash, role, active, created_at) FROM stdin;
a4ffecd1-7674-4d8e-9f02-dd924eebfb81	owner@kairalibooks.in	Radhika Menon	$2b$12$uiF1l71YQqT0ZMKMXqtm1er2A.r/i2moAu9Rr96yr5hUKN1jVAKNi	owner	t	2026-08-11 05:27:47
f231ceb3-ec79-46b4-b857-431ca1ce216a	accounts@kairalibooks.in	Suresh Kumar	$2b$12$s.GadflPkxeBh/l5e0DBueftw2Z3pwk4GNkWungXryeh.jJo9ZOxS	accounts	t	2026-08-11 05:27:47
2ecfdda7-cf9d-4469-9999-8a315cc0d27a	store@kairalibooks.in	Anila Joseph	$2b$12$s3UFghshbs4s4Hv6sk9KqO7jI2FE4dDKP/Nm.HVj.nZ44qqjcTGfu	store	t	2026-08-11 05:27:47
223b70c0-bc7e-4f7e-b647-2223425ae122	press@kairalibooks.in	Vinod Chandran	$2b$12$DOsktkZgLIIfsZdE6MkjZev8HrXD0azCeUj4YipUg1EbHGajWjoxe	production	t	2026-08-11 05:27:47
c937247e-12c4-4a09-a6c9-a686a1f05e2a	editor@kairalibooks.in	Editor Staff	$2b$12$Xa8Yg9Vxph6N/I29KgbmEuZb3qWDw3fnPnK7I.rtIjkr.oec8qgru	editor	t	2026-08-27 10:34:48
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.audit_log (id, user_id, action, entity, entity_id, detail, at) FROM stdin;
9569834d-e88d-4744-a16d-33c58b03fec8	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	login	auth	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	{"email":"owner@kairalibooks.in","role":"owner"}	2026-08-11 05:28:38
9cae03a3-7388-4a9b-9ccc-c71bdbe6e800	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	login	auth	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	{"email":"store@kairalibooks.in","role":"store"}	2026-08-11 05:43:53
7db2385a-6b55-42a2-a44e-bbf7762e8008	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	sale_created	sale	a4b95e44-7cbd-4bca-aee4-ade83aedcc60	{"docNo":"INV-2026-0001","totalPaise":39900,"channel":"retail","lines":1}	2026-08-11 05:47:21
ff3f112d-c22b-401d-8aec-efe7d65e1757	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	contract_updated	contract	8920600c-f63e-4106-8e23-01bd665f964f	{"titleId":"979dad4c-241f-4fd5-8c41-feb5829a0250","authorId":"bc98b92d-c643-47e4-bdb1-e4196491dc23","royaltyPctTo":18,"basisTo":"net","advancePaiseTo":20000000,"royaltyPctFrom":18,"basisFrom":"net","advancePaiseFrom":20000000}	2026-08-11 05:49:28
4e388afe-2946-4e9f-89ba-a0b8c16e803b	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	print_job_created	print_job	e24c4c4d-8949-4da0-a18a-7b92732f3608	{"titleId":"1ba34910-737c-4e1c-a67b-0bd919db0d28","qty":1000,"estimatedCostPaise":12200}	2026-08-11 05:50:34
046dde4d-b692-409b-889c-1f7e048f7bc7	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	logout	auth	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	{"email":"store@kairalibooks.in"}	2026-08-11 05:51:13
3af75528-6803-4c9c-8d47-9faf4d69578c	223b70c0-bc7e-4f7e-b647-2223425ae122	login	auth	223b70c0-bc7e-4f7e-b647-2223425ae122	{"email":"press@kairalibooks.in","role":"production"}	2026-08-11 05:52:32
7811ada2-01a5-4fca-b5cf-2d4c7ee7cd82	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	print_job_status_changed	print_job	e24c4c4d-8949-4da0-a18a-7b92732f3608	{"jobNo":"JOB-2026-0001","from":"pending","to":"cancelled"}	2026-08-11 05:52:46
38d6fdb8-4ff4-4b5d-a9fc-b707977f9ef5	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	print_job_created	print_job	9e15114c-6a8d-4fc3-8589-1aab82f9bcaf	{"titleId":"1ba34910-737c-4e1c-a67b-0bd919db0d28","qty":1000,"estimatedCostPaise":12200}	2026-08-11 05:53:41
dca19882-abd0-4597-9392-bb4e17c939ee	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	print_job_status_changed	print_job	9e15114c-6a8d-4fc3-8589-1aab82f9bcaf	{"jobNo":"JOB-2026-0002","from":"pending","to":"printing"}	2026-08-11 05:54:05
bee32edb-7cb2-447a-a1a9-075fd21ceb55	223b70c0-bc7e-4f7e-b647-2223425ae122	print_job_received	print_job	9e15114c-6a8d-4fc3-8589-1aab82f9bcaf	{"jobNo":"JOB-2026-0002","orderedQty":1000,"receivedQty":1000,"shortBy":0,"actualCostPaise":12200,"unitCostPaiseTo":12,"unitCostPaiseFrom":12}	2026-08-11 05:54:14
3c35302f-262b-490d-b424-ab8f58fe3c0a	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	author_created	author	1057e696-0aeb-47f0-80ad-1b78172d7e85	{"name":"Jamshad Ali [Megamind]"}	2026-08-11 05:54:57
64f970a5-6fed-4a34-92a6-929e3befee3d	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	author_updated	author	1057e696-0aeb-47f0-80ad-1b78172d7e85	{"name":"Jamshad Ali [Megamind]"}	2026-08-11 05:55:18
d47f08e6-db3d-4355-a364-dbc11384fa82	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	title_created	title	b87c6f62-fc52-4165-9689-7d84514b14b6	{"name":"Jamshad Ali [Megamind]","isbn":"d23","mrpPaise":22200}	2026-08-11 05:55:54
c3df3dd2-09dc-4ee3-96cc-7edf052de988	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	print_job_created	print_job	cbcada3c-cb0d-4ff5-bd91-fb4f5e10f103	{"titleId":"b87c6f62-fc52-4165-9689-7d84514b14b6","qty":1000,"estimatedCostPaise":300000}	2026-08-11 05:56:41
496e422d-8788-483f-8f3a-3ade5bc32a91	223b70c0-bc7e-4f7e-b647-2223425ae122	print_job_status_changed	print_job	cbcada3c-cb0d-4ff5-bd91-fb4f5e10f103	{"jobNo":"JOB-2026-0003","from":"pending","to":"printing"}	2026-08-11 05:57:13
187361e5-db78-486f-a6ce-3a8c1abab50f	223b70c0-bc7e-4f7e-b647-2223425ae122	print_job_received	print_job	cbcada3c-cb0d-4ff5-bd91-fb4f5e10f103	{"jobNo":"JOB-2026-0003","orderedQty":1000,"receivedQty":1000,"shortBy":0,"actualCostPaise":300000,"unitCostPaiseTo":300,"unitCostPaiseFrom":300}	2026-08-11 05:57:26
dfbd0a74-3f6e-49ed-bb44-e03158d96df2	223b70c0-bc7e-4f7e-b647-2223425ae122	logout	auth	223b70c0-bc7e-4f7e-b647-2223425ae122	{"email":"press@kairalibooks.in"}	2026-08-11 05:57:58
507cb11b-3e71-4615-85f5-b91aeb3ff421	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	login	auth	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	{"email":"store@kairalibooks.in","role":"store"}	2026-08-11 05:58:09
93b0e523-8e9d-40e5-9f7a-934869360bf6	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	dealer_created	dealer	bbf3c938-d7c1-4954-85b1-6e491a0143ed	{"name":"Jamshad Ali [Megamind]","discountPct":30}	2026-08-11 05:58:42
6d6d3bed-a965-4436-956e-6eddb1d734e3	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	sale_created	sale	805c1922-fa34-4af8-be47-bf7ca4a69ba3	{"docNo":"INV-2026-0002","totalPaise":22239900,"channel":"dealer","lines":2}	2026-08-11 07:13:01
cffc6749-d795-429a-8c79-a477a78e50be	\N	submission_received	submission	981f714f-9f38-4e70-8504-2fbee532dcca	{"ref_no":"SUB-2026-0001","genre":"short_stories","title":"dwe"}	2026-08-21 11:47:19
02ebe1af-db63-43d7-a333-25edffcb8283	\N	submission_received	submission	eb53c2bd-1d0e-49d8-85bf-cff9420f9906	{"ref_no":"SUB-2026-0002","genre":"novel","title":"dewd"}	2026-08-21 12:11:49
7f044371-9db8-4ad2-9d4d-3e9c97963485	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	login	user	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	\N	2026-08-21 12:12:36
67095b6f-fa56-4b51-8a18-7e2b752a16d2	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	accept_submission	submission	eb53c2bd-1d0e-49d8-85bf-cff9420f9906	{"ref_no":"SUB-2026-0002","title":"dewd","author_id":"1d36993a-fdb2-4691-a1c2-ed1eadb38457","title_id":"ddd380e7-4044-4bc9-9d32-39338d9f4cb6"}	2026-08-21 12:13:35
6bf15eba-0cfe-416c-98e4-6d66268886ad	\N	author_signed_contract	submission	eb53c2bd-1d0e-49d8-85bf-cff9420f9906	{"ref_no":"SUB-2026-0002","contract_id":"da504980-c2f5-4ec3-bb21-09b2b5631d32"}	2026-08-21 12:15:04
b7395593-3004-4c03-9c05-7ccbba34c002	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"dtp"}	2026-08-21 12:16:55
ab76ddf7-1090-45ce-81d4-c1c3968941e0	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	complete_production_dtp	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2"}	2026-08-21 12:16:59
661fa659-40f5-4e0e-82a3-5517ad438f0d	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	complete_production_editing	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2"}	2026-08-21 12:17:22
ff41621d-8bd3-4eda-a36f-865a3081e5c2	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	complete_production_cover	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2"}	2026-08-21 12:17:22
f4b91c5b-3076-4f6b-9443-06406d0d862d	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	complete_production_isbn	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","isbn":"978-81-12345-67-8"}	2026-08-21 12:17:34
27952914-55e0-4ca5-9135-a8226b94dbfd	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:40
4ed054ac-5e0b-450b-a7f8-290a252ec65c	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:41
f6f62397-afbc-45a8-88ab-85ead4c21ebf	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:41
dd67fdf6-acaf-472d-9370-96c5f4a086aa	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:42
9a01232f-4ea5-437a-85ed-46457318779a	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:42
81354229-32ae-4087-b18d-7014f74896bf	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:42
cfd16b82-e056-4a75-8843-84dbe75909f9	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:50
534c0c59-616c-4f95-9547-f47f70e2779e	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:52
eb35b427-8b26-4f58-b7d8-b479f2f5c7cf	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:52
298772c1-2af1-406c-acdc-83aa8c6ad32c	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:53
8d4630ca-95b8-4270-9337-4483cc1aff65	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:53
a79ce5c8-a5e0-4328-9228-22084bdb4135	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:53
a6fac6a6-f5e3-47a3-a9f5-c7aef54a9d45	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:54
d73d677b-05d9-4a7b-878c-111283d4f6a3	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:54
a192f6fd-cca0-4ba6-84f2-14e64fbb185a	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:54
328f8bc1-b72a-4612-a5d7-c92787cb897f	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:54
22f4fe14-a5cc-4de4-9270-43a1a024c3e4	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:55
122b9528-179b-4435-8242-95a08b49e06e	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:55
a0fa03d6-d4ee-4da8-a648-f24ad1b76521	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:55
a2436b4a-613a-4f1b-a6ca-fa1affb9899d	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:55
aead1ffc-7b80-4255-8a74-663f45c560ca	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:55
75b259f4-2cbb-4135-80da-0a716c8e653b	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:55
8900f3ee-8013-40bf-a629-3e363ca02465	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:17:56
617692bd-331b-4da2-8f59-6f00bb47c125	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:03
d650ec43-18f5-4c1f-b7f7-1599b4508df8	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:03
9ce017e4-c70b-4d4c-827f-71a9ae2a3b89	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:03
e9c01fe2-a74d-4866-a51a-3be697c552ef	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:03
3809da12-aae3-4499-90d8-e4961503bfb3	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:04
3cfa74d9-f36e-47ed-99a0-f46e5d31bf61	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:04
e8d40825-40da-4539-a6b3-325ed96418bb	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:05
88ede98f-4d81-43cb-9dc8-d6f3c6ce9ce6	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:06
ff95e4e7-cea6-4303-aed3-9c1a1dd18668	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:03
b6d88293-92b8-4374-9583-56256becbcf5	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:04
da2a78e7-5ef3-4af2-b50d-5ad99cb29ef0	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:04
8b8cc824-82aa-4b33-aa2e-8606b2a490bd	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:04
a0f87cc1-0bd3-4bcf-b8fe-697f0e7842bc	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:06
ff30aac3-bd8c-4ff2-a881-01fbec7c4020	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:22
5f789fe2-65a7-4a8f-ac58-0750b4e129fb	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:23
a36aaa12-1746-492c-89b5-b1f9b6d79b26	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	update_production_schedule	production_project	e6ce923f-866e-49e8-87cf-04ca761a70a2	{"project_id":"e6ce923f-866e-49e8-87cf-04ca761a70a2","status":"final_proof"}	2026-08-21 12:18:24
fa366c84-3c1b-4c69-8363-b0974e6e657b	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	login	user	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	\N	2026-08-21 12:54:44
474c7877-e41a-483b-88b3-49ed16c7f282	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	login	user	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	\N	2026-08-27 06:42:58
254ac43d-049c-4851-be23-c149c2c3f1f5	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	login	user	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	\N	2026-08-27 06:46:19
4f375ac4-06a8-4180-a6f4-ed87cc5538f2	\N	submission_received	submission	240602d2-3229-4ae7-9caa-df7cd3da72d8	{"ref_no":"SUB-2026-0003","genre":"essays","title":"Kerala Charithram: Naveena Kazhchakal"}	2026-08-27 06:59:33
bbefc483-d419-4a94-8b2b-dd79f7be0f6b	\N	submission_received	submission	d0a8fcc7-6c34-44d2-a7fc-1fd2138ce3d8	{"ref_no":"SUB-2026-0004","genre":"essays","title":"Kerala Charithram: Naveena Kazhchakal"}	2026-08-27 07:18:35
fe804998-90a6-4716-82f0-4f0108ba4a7d	\N	submission_received	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	{"ref_no":"SUB-2026-0005","genre":"short_stories","title":"Testing"}	2026-08-27 07:33:17
7f59ad1a-5813-4fa9-85e2-e55b363fdd07	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	decline_submission	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	{"ref_no":"SUB-2026-0005","title":"Testing"}	2026-08-27 07:41:38
cf197e41-d396-42c2-8797-cac712ee04de	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	reassign_submission	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	{"ref_no":"SUB-2026-0005","title":"Testing","previous_editor":"f231ceb3-ec79-46b4-b857-431ca1ce216a","new_editor":"223b70c0-bc7e-4f7e-b647-2223425ae122"}	2026-08-27 10:30:58
237a05c6-a3b3-4213-a866-40a86a79e606	c937247e-12c4-4a09-a6c9-a686a1f05e2a	login	user	c937247e-12c4-4a09-a6c9-a686a1f05e2a	\N	2026-08-27 10:35:28
f505a025-0493-4d63-b4cf-5d9af4f5056f	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	reassign_submission	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	{"ref_no":"SUB-2026-0005","title":"Testing","previous_editor":"223b70c0-bc7e-4f7e-b647-2223425ae122","new_editor":"c937247e-12c4-4a09-a6c9-a686a1f05e2a"}	2026-08-27 10:36:29
ccf6cdec-8894-44d2-9d74-7c0b682c616e	c937247e-12c4-4a09-a6c9-a686a1f05e2a	request_submission_revision	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	{"ref_no":"SUB-2026-0005","title":"Testing","feedback_summary":"revision fre"}	2026-08-27 10:44:28
ced838e5-c26c-4c27-90cf-3b6b0b516179	\N	author_upload_revision	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	{"ref_no":"SUB-2026-0005","title":"Testing"}	2026-08-27 10:45:04
3e6c0338-02b1-49b3-9ce3-e892dde6bbcc	\N	sign_contract_author	contract	da504980-c2f5-4ec3-bb21-09b2b5631d32	{"title":"dewd","signer":"James ClearJames Clear","ip":"::1"}	2026-08-27 11:15:48
ffbcf2b0-d6ba-4bae-bca1-e75e8ef0031a	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	sign_contract_publisher	contract	da504980-c2f5-4ec3-bb21-09b2b5631d32	{"title":"dewd","signer":"Radhika Menon"}	2026-08-27 11:16:48
\.


--
-- Data for Name: authors; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.authors (id, name, name_ml, phone, email, address, pan, notes, created_at) FROM stdin;
4a7a3652-11e9-4ab3-b52d-5b2f7d0bb4e1	O. V. Vijayan	ഒ. വി. വിജയൻ	+91 98470 11201	estate.ovvijayan@example.in	\N	AAAPV1234A	\N	2026-08-11 05:27:47
4be6ef4a-0f45-4965-9caf-d90a03f02eba	M. T. Vasudevan Nair	എം. ടി. വാസുദേവൻ നായർ	+91 94470 22315	mtv@example.in	\N	AABPN5678B	\N	2026-08-11 05:27:47
294c8f9f-4c2b-4aaa-87ef-e960aba2412e	Vaikom Muhammad Basheer	വൈക്കം മുഹമ്മദ് ബഷീർ	+91 90480 33422	basheer.estate@example.in	\N	AACPB9012C	\N	2026-08-11 05:27:47
9ac4c589-f237-4313-95fa-6355c77dd2c3	Thakazhi Sivasankara Pillai	തകഴി ശിവശങ്കര പിള്ള	+91 97460 44519	thakazhi.estate@example.in	\N	AADPP3456D	\N	2026-08-11 05:27:47
9b2acfdc-3ab0-439f-bbb5-a93c5230badb	S. K. Pottekkatt	എസ്. കെ. പൊറ്റെക്കാട്ട്	+91 95440 55637	skp.estate@example.in	\N	AAEPK7890E	\N	2026-08-11 05:27:47
bc98b92d-c643-47e4-bdb1-e4196491dc23	Benyamin	ബെന്യാമിൻ	+91 99950 66748	benyamin@example.in	\N	AAFPB2345F	\N	2026-08-11 05:27:47
1057e696-0aeb-47f0-80ad-1b78172d7e85	Jamshad Ali [Megamind]	Jamshad Ali [Megamind]	07012257903	developer@megamind.studio	manglore	dewdew	dewdew	2026-08-11 05:54:57
1d36993a-fdb2-4691-a1c2-ed1eadb38457	James Clear	\N	\N	james@example.com	\N	ABCDE1234F	Created from accepted submission SUB-2026-0002	2026-08-21 12:13:35
\.


--
-- Data for Name: titles; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.titles (id, isbn, name, name_ml, author_id, category, language, edition, edition_no, parent_title_id, mrp_paise, unit_cost_paise, pages, binding, reorder_level, stock, status, created_at) FROM stdin;
601a5025-4539-4382-9a89-817aa6ffcba7	9788126415472	Khasakkinte Ithihasam	ഖസാക്കിന്റെ ഇതിഹാസം	4a7a3652-11e9-4ab3-b52d-5b2f7d0bb4e1	Novel	Malayalam	1st	1	\N	38000	11250	208	Paperback	40	320	active	2026-08-11 05:27:47
16dc6120-7310-435a-b931-a8de181c1739	9788126415489	Khasakkinte Ithihasam	ഖസാക്കിന്റെ ഇതിഹാസം	4a7a3652-11e9-4ab3-b52d-5b2f7d0bb4e1	Novel	Malayalam	2nd (commemorative)	2	601a5025-4539-4382-9a89-817aa6ffcba7	65000	20675	240	Hardbound	20	85	active	2026-08-11 05:27:47
06dc884b-b708-4596-89c7-0870ececc7b0	9788126415496	Dharmapuranam	ധർമ്മപുരാണം	4a7a3652-11e9-4ab3-b52d-5b2f7d0bb4e1	Novel	Malayalam	1st	1	\N	29500	9425	176	Paperback	30	140	active	2026-08-11 05:27:47
d0f4d094-0bd7-48b4-b627-e22a9bb433ba	9788171301157	Randamoozham	രണ്ടാമൂഴം	4be6ef4a-0f45-4965-9caf-d90a03f02eba	Novel	Malayalam	1st	1	\N	45000	13800	296	Paperback	50	412	active	2026-08-11 05:27:47
77255abc-b443-4287-8103-bfe4942a6ccd	9788171301164	Manju	മഞ്ഞ്	4be6ef4a-0f45-4965-9caf-d90a03f02eba	Novel	Malayalam	1st	1	\N	22000	7150	128	Paperback	30	24	active	2026-08-11 05:27:47
2c23dccc-b636-4248-bd20-e6de69a469f6	9788171300228	Balyakalasakhi	ബാല്യകാലസഖി	294c8f9f-4c2b-4aaa-87ef-e960aba2412e	Novel	Malayalam	1st	1	\N	18000	5675	96	Paperback	60	508	active	2026-08-11 05:27:47
1561c681-35c1-478b-82aa-8ea1c674dd9d	9788126415502	Chemmeen	ചെമ്മീൻ	9ac4c589-f237-4313-95fa-6355c77dd2c3	Novel	Malayalam	1st	1	\N	34000	10400	224	Paperback	45	267	active	2026-08-11 05:27:47
210303bf-5cd1-49e1-963f-ff1ecb0e821f	9788126415519	Oru Desathinte Katha	ഒരു ദേശത്തിന്റെ കഥ	9b2acfdc-3ab0-439f-bbb5-a93c5230badb	Novel	Malayalam	1st	1	\N	57500	18150	464	Hardbound	25	96	active	2026-08-11 05:27:47
15407a62-bd40-4cae-a449-c8c8a3bca801	9788126415526	Vishakanyaka	വിഷകന്യക	9b2acfdc-3ab0-439f-bbb5-a93c5230badb	Novel	Malayalam	1st	1	\N	26000	8800	192	Paperback	20	12	out_of_print	2026-08-11 05:27:47
01c8a228-f661-4c4e-a806-ac983f43c500	9788126415540	Manthalirile Ilam Thalirukal	മന്തളിരിലെ ഇളം തളിരുകൾ	bc98b92d-c643-47e4-bdb1-e4196491dc23	Essays	Malayalam	1st	1	\N	24000	7950	144	Paperback	25	63	active	2026-08-11 05:27:47
b87c6f62-fc52-4165-9689-7d84514b14b6	d23	Jamshad Ali [Megamind]	Jamshad Ali [Megamind]	1057e696-0aeb-47f0-80ad-1b78172d7e85	dqdwe	Malayalam	1st	1	\N	22200	300	122	122	30	0	active	2026-08-11 05:55:54
1ba34910-737c-4e1c-a67b-0bd919db0d28	9788171300235	Pathummayude Aadu	പാത്തുമ്മായുടെ ആട്	294c8f9f-4c2b-4aaa-87ef-e960aba2412e	Novel	Malayalam	1st	1	\N	19000	12	104	Paperback	40	1000	active	2026-08-11 05:27:47
979dad4c-241f-4fd5-8c41-feb5829a0250	9788126415533	Aadujeevitham	ആടുജീവിതം	bc98b92d-c643-47e4-bdb1-e4196491dc23	Novel	Malayalam	1st	1	\N	39900	11875	232	Paperback	80	738	active	2026-08-11 05:27:47
ddd380e7-4044-4bc9-9d32-39338d9f4cb6	978-81-12345-67-8	dewd	\N	1d36993a-fdb2-4691-a1c2-ed1eadb38457	novel	Malayalam	1st	1	\N	0	0	\N	\N	30	0	active	2026-08-21 12:13:35
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.contracts (id, title_id, author_id, royalty_pct, basis, advance_paise, signed_on, term_notes, created_at) FROM stdin;
8531092a-2d80-4f0f-9bb7-bc4df62c5650	601a5025-4539-4382-9a89-817aa6ffcba7	4a7a3652-11e9-4ab3-b52d-5b2f7d0bb4e1	12.5	mrp	5000000	2019-06-14	Five-year term, renewable. Advance recovered against all editions.	2026-08-11 05:27:47
93a5581d-d25f-4f16-b354-9f97b31d2f0a	16dc6120-7310-435a-b931-a8de181c1739	4a7a3652-11e9-4ab3-b52d-5b2f7d0bb4e1	15	mrp	7500000	2023-02-02	Commemorative edition. Higher rate agreed with the estate.	2026-08-11 05:27:47
c0d0833b-f324-43d0-9c67-4b58a6d7c8dc	06dc884b-b708-4596-89c7-0870ececc7b0	4a7a3652-11e9-4ab3-b52d-5b2f7d0bb4e1	10	mrp	0	2019-06-14	Same term sheet as Khasak. No separate advance.	2026-08-11 05:27:47
0a87a67a-e568-48b3-9dae-edd0e298d3a1	d0f4d094-0bd7-48b4-b627-e22a9bb433ba	4be6ef4a-0f45-4965-9caf-d90a03f02eba	15	net	12000000	2021-09-01	Royalty on net receipts. Statements half-yearly.	2026-08-11 05:27:47
e89c912c-b3a2-40ed-8d82-e573fddcd189	77255abc-b443-4287-8103-bfe4942a6ccd	4be6ef4a-0f45-4965-9caf-d90a03f02eba	12	net	2500000	2021-09-01	Net basis, in line with the author's other titles.	2026-08-11 05:27:47
976a58eb-faa5-45ed-a9ba-ff92908c721a	2c23dccc-b636-4248-bd20-e6de69a469f6	294c8f9f-4c2b-4aaa-87ef-e960aba2412e	10	mrp	0	2018-04-11	Estate agreement. Settled every April.	2026-08-11 05:27:47
256a2347-ba60-4a95-8668-345aa68efbb5	1ba34910-737c-4e1c-a67b-0bd919db0d28	294c8f9f-4c2b-4aaa-87ef-e960aba2412e	10	mrp	0	2018-04-11	Estate agreement. Settled every April.	2026-08-11 05:27:47
e54f4bea-c0f9-48c7-867c-6a6703f0d88b	1561c681-35c1-478b-82aa-8ea1c674dd9d	9ac4c589-f237-4313-95fa-6355c77dd2c3	11	mrp	4000000	2020-01-20	Advance recovered before any payout.	2026-08-11 05:27:47
6af3f699-4569-48a0-890b-c97f2ec7610b	210303bf-5cd1-49e1-963f-ff1ecb0e821f	9b2acfdc-3ab0-439f-bbb5-a93c5230badb	14	net	6000000	2022-07-19	Net basis. Dealer discount comes off before the royalty is computed.	2026-08-11 05:27:47
cadb19db-6d2f-4bed-b529-3cd08af09e2e	15407a62-bd40-4cae-a449-c8c8a3bca801	9b2acfdc-3ab0-439f-bbb5-a93c5230badb	10	mrp	0	2022-07-19	Out of print. Contract retained for back-list settlement.	2026-08-11 05:27:47
5c504711-fff8-4373-aed5-a7035bd34c21	01c8a228-f661-4c4e-a806-ac983f43c500	bc98b92d-c643-47e4-bdb1-e4196491dc23	12	net	3000000	2024-03-05	Same term sheet as Aadujeevitham.	2026-08-11 05:27:47
8920600c-f63e-4106-8e23-01bd665f964f	979dad4c-241f-4fd5-8c41-feb5829a0250	bc98b92d-c643-47e4-bdb1-e4196491dc23	18	net	20000000	2024-03-05	Large advance against the tie-in reprint. Net receipts basis.	2026-08-11 05:27:47
da504980-c2f5-4ec3-bb21-09b2b5631d32	ddd380e7-4044-4bc9-9d32-39338d9f4cb6	1d36993a-fdb2-4691-a1c2-ed1eadb38457	10	mrp	1000000	2026-08-27 11:16:48	{"publishing_type":"kairali_funded","term_years":3,"free_copies":10,"author_discount_pct":40,"gst_pct":18,"author_pan":"ABCDE1234F","author_bank_account":null,"author_ifsc":null,"publisher_signatory":"Radhika Menon","publisher_signed_at":"2026-08-27 11:16:48","publisher_signature":"Digitally Authorized by Radhika Menon (Kairali Books)","author_signed_at":"2026-08-27 11:15:48","author_signature":"Digitally Signed by James ClearJames Clear (Typed Authentication)","author_signer_name":"James ClearJames Clear","author_signer_ip":"::1","author_signer_ua":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36","notes":"Publishing type: kairali_funded. Generated from submission SUB-2026-0002"}	2026-08-21 12:13:35
\.


--
-- Data for Name: counters; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.counters (name, value) FROM stdin;
print_job:2026	3
invoice:2026	2
submission:2026	5
\.


--
-- Data for Name: dealers; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.dealers (id, name, contact, phone, gstin, address, discount_pct, credit_limit_paise, created_at) FROM stdin;
ba05058a-37f8-4038-b820-9058055e20dc	Kozhikode Book House	Faisal P. K.	+91 98460 77812	32AABCK1234M1Z5	Mavoor Road, Kozhikode 673004	35	15000000	2026-08-11 05:27:47
8bb4f6ea-7fba-4afc-a017-26d19621b411	Ernakulam Book Depot	Leena Thomas	+91 94470 88923	32AAECE5678N1Z9	Broadway, Ernakulam 682031	40	25000000	2026-08-11 05:27:47
5eea6832-0be7-4156-b775-68bef58eac49	Thrissur Pusthaka Vipani	Ramesh Nambiar	+91 90370 99034	32AAFCT9012P1Z3	Round South, Thrissur 680001	30	10000000	2026-08-11 05:27:47
bbf3c938-d7c1-4954-85b1-6e491a0143ed	Jamshad Ali [Megamind]	Jamshad Ali [Megamind]	07012257903	dwedwdw	manglore	30	0	2026-08-11 05:58:42
\.


--
-- Data for Name: email_outbox; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.email_outbox (id, to_email, to_name, subject, body_text, body_html, template, ref_type, ref_id, status, attempts, last_error, created_at, sent_at) FROM stdin;
4d7e5d52-8c7c-4759-a8f7-7216883f14eb	developer@megamind.studio	Jamshad Ali [Megamind]	We received your manuscript — SUB-2026-0001	Dear Jamshad Ali [Megamind],\n\nThank you for sending your manuscript to Kairali Books.\n\nReference number: SUB-2026-0001\nManuscript: dwe\n\nOur editorial team reads every submission. You can expect to hear from us\nwithin 8 weeks. Please quote your reference number in any\ncorrespondence about this submission.\n\nWe are grateful for the chance to read your work.\n\nKairali Books\nകൈരളി ബുക്സ്	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear Jamshad Ali [Megamind],</p>\n  <p>Thank you for sending your manuscript to Kairali Books.</p>\n  <table style="border-collapse:collapse;margin:20px 0;background:#f7f6f2;border-radius:8px">\n    <tr><td style="padding:10px 14px;color:#6b6559">Reference number</td>\n        <td style="padding:10px 14px;font-weight:600">SUB-2026-0001</td></tr>\n    <tr><td style="padding:10px 14px;color:#6b6559">Manuscript</td>\n        <td style="padding:10px 14px;font-weight:600">dwe</td></tr>\n  </table>\n  <p>Our editorial team reads every submission. You can expect to hear from us\n     within <strong>8 weeks</strong>. Please quote your reference\n     number in any correspondence about this submission.</p>\n  <p>We are grateful for the chance to read your work.</p>\n  <p style="color:#6b6559">Kairali Books · കൈരളി ബുക്സ്</p>\n</div>	submission_received	submission	981f714f-9f38-4e70-8504-2fbee532dcca	pending	0	\N	2026-08-21 11:47:19	\N
ad669fe8-d7d6-40b6-b04e-c028f5867148	james@example.com	James Clear	We received your manuscript — SUB-2026-0002	Dear James Clear,\n\nThank you for sending your manuscript to Kairali Books.\n\nReference number: SUB-2026-0002\nManuscript: dewd\n\nOur editorial team reads every submission. You can expect to hear from us\nwithin 8 weeks. Please quote your reference number in any\ncorrespondence about this submission.\n\nWe are grateful for the chance to read your work.\n\nKairali Books\nകൈരളി ബുക്സ്	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear James Clear,</p>\n  <p>Thank you for sending your manuscript to Kairali Books.</p>\n  <table style="border-collapse:collapse;margin:20px 0;background:#f7f6f2;border-radius:8px">\n    <tr><td style="padding:10px 14px;color:#6b6559">Reference number</td>\n        <td style="padding:10px 14px;font-weight:600">SUB-2026-0002</td></tr>\n    <tr><td style="padding:10px 14px;color:#6b6559">Manuscript</td>\n        <td style="padding:10px 14px;font-weight:600">dewd</td></tr>\n  </table>\n  <p>Our editorial team reads every submission. You can expect to hear from us\n     within <strong>8 weeks</strong>. Please quote your reference\n     number in any correspondence about this submission.</p>\n  <p>We are grateful for the chance to read your work.</p>\n  <p style="color:#6b6559">Kairali Books · കൈരളി ബുക്സ്</p>\n</div>	submission_received	submission	eb53c2bd-1d0e-49d8-85bf-cff9420f9906	pending	0	\N	2026-08-21 12:11:49	\N
b4c17080-0f9f-4e57-84be-61b73e15433b	james@example.com	James Clear	Congratulations! Your manuscript has been accepted — SUB-2026-0002	Dear James Clear,\n\nWe are thrilled to inform you that your manuscript "dewd" (Reference: SUB-2026-0002) has been accepted for publication by Kairali Books!\n\nWe have generated your contract and publishing terms. Please log into your author portal to review the terms and digitally sign the contract:\nhttp://localhost:3000/publish/status?ref=SUB-2026-0002&email=james%40example.com\n\nOnce signed, your manuscript will transition to our production pipeline. We are excited to partner with you to bring your book to readers.\n\nCongratulations once again!\n\nSincerely,\nKairali Books	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear James Clear,</p>\n  <p>We are thrilled to inform you that your manuscript "<strong>dewd</strong>" (Reference: SUB-2026-0002) has been accepted for publication by Kairali Books!</p>\n  <p>We have generated your contract and publishing terms. Please log into your author portal to review the terms and digitally sign the contract:</p>\n  <p><a href="http://localhost:3000/publish/status?ref=SUB-2026-0002&amp;email=james%40example.com" style="display:inline-block;background:#0f5d55;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:500">Review & Sign Contract</a></p>\n  <p>Once signed, your manuscript will transition to our production pipeline. We are excited to partner with you to bring your book to readers.</p>\n  <p>Congratulations once again!</p>\n  <p style="color:#6b6559">Sincerely,<br>Kairali Books</p>\n</div>	submission_accepted	submission	eb53c2bd-1d0e-49d8-85bf-cff9420f9906	pending	0	\N	2026-08-21 12:13:35	\N
d091d38b-f21d-47ff-bfeb-ea4064cfc6ef	james@example.com	James Clear	Contract Fully Signed — SUB-2026-0002	Dear James Clear,\n\nThank you for signing the publishing contract for "dewd".\n\nBoth parties have now executed the contract. Your book is officially moving to our production pipeline.\n\nSincerely,\nKairali Books	\N	\N	\N	\N	pending	0	\N	2026-08-21 12:15:04	\N
bc19eaec-df32-4a97-920d-5e3413813ad1	ks.radhakrishnan@example.com	Dr. K. S. Radhakrishnan	We received your manuscript — SUB-2026-0003	Dear Dr. K. S. Radhakrishnan,\n\nThank you for sending your manuscript to Kairali Books.\n\nReference number: SUB-2026-0003\nManuscript: Kerala Charithram: Naveena Kazhchakal\n\nOur editorial team reads every submission. You can expect to hear from us\nwithin 8 weeks. Please quote your reference number in any\ncorrespondence about this submission.\n\nWe are grateful for the chance to read your work.\n\nKairali Books\nകൈരളി ബുക്സ്	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear Dr. K. S. Radhakrishnan,</p>\n  <p>Thank you for sending your manuscript to Kairali Books.</p>\n  <table style="border-collapse:collapse;margin:20px 0;background:#f7f6f2;border-radius:8px">\n    <tr><td style="padding:10px 14px;color:#6b6559">Reference number</td>\n        <td style="padding:10px 14px;font-weight:600">SUB-2026-0003</td></tr>\n    <tr><td style="padding:10px 14px;color:#6b6559">Manuscript</td>\n        <td style="padding:10px 14px;font-weight:600">Kerala Charithram: Naveena Kazhchakal</td></tr>\n  </table>\n  <p>Our editorial team reads every submission. You can expect to hear from us\n     within <strong>8 weeks</strong>. Please quote your reference\n     number in any correspondence about this submission.</p>\n  <p>We are grateful for the chance to read your work.</p>\n  <p style="color:#6b6559">Kairali Books · കൈരളി ബുക്സ്</p>\n</div>	submission_received	submission	240602d2-3229-4ae7-9caa-df7cd3da72d8	pending	0	\N	2026-08-27 06:59:33	\N
962f118e-fa0a-485e-8c95-3814a2e5160f	akamliveconnect@gmail.com	Dr. K. S. Radhakrishnan	We received your manuscript — SUB-2026-0004	Dear Dr. K. S. Radhakrishnan,\n\nThank you for sending your manuscript to Kairali Books.\n\nReference number: SUB-2026-0004\nManuscript: Kerala Charithram: Naveena Kazhchakal\n\nOur editorial team reads every submission. You can expect to hear from us\nwithin 8 weeks. Please quote your reference number in any\ncorrespondence about this submission.\n\nWe are grateful for the chance to read your work.\n\nKairali Books\nകൈരളി ബുക്സ്	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear Dr. K. S. Radhakrishnan,</p>\n  <p>Thank you for sending your manuscript to Kairali Books.</p>\n  <table style="border-collapse:collapse;margin:20px 0;background:#f7f6f2;border-radius:8px">\n    <tr><td style="padding:10px 14px;color:#6b6559">Reference number</td>\n        <td style="padding:10px 14px;font-weight:600">SUB-2026-0004</td></tr>\n    <tr><td style="padding:10px 14px;color:#6b6559">Manuscript</td>\n        <td style="padding:10px 14px;font-weight:600">Kerala Charithram: Naveena Kazhchakal</td></tr>\n  </table>\n  <p>Our editorial team reads every submission. You can expect to hear from us\n     within <strong>8 weeks</strong>. Please quote your reference\n     number in any correspondence about this submission.</p>\n  <p>We are grateful for the chance to read your work.</p>\n  <p style="color:#6b6559">Kairali Books · കൈരളി ബുക്സ്</p>\n</div>	submission_received	submission	d0a8fcc7-6c34-44d2-a7fc-1fd2138ce3d8	sent	0	\N	2026-08-27 07:18:32	2026-08-27 07:18:35
7573a530-893f-40d5-8cae-429c86d2ddc9	developer@megamind.studio	Megamind Connect	We received your manuscript — SUB-2026-0005	Dear Megamind Connect,\n\nThank you for sending your manuscript to Kairali Books.\n\nReference number: SUB-2026-0005\nManuscript: Testing\n\nOur editorial team reads every submission. You can expect to hear from us\nwithin 8 weeks. Please quote your reference number in any\ncorrespondence about this submission.\n\nWe are grateful for the chance to read your work.\n\nKairali Books\nകൈരളി ബുക്സ്	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear Megamind Connect,</p>\n  <p>Thank you for sending your manuscript to Kairali Books.</p>\n  <table style="border-collapse:collapse;margin:20px 0;background:#f7f6f2;border-radius:8px">\n    <tr><td style="padding:10px 14px;color:#6b6559">Reference number</td>\n        <td style="padding:10px 14px;font-weight:600">SUB-2026-0005</td></tr>\n    <tr><td style="padding:10px 14px;color:#6b6559">Manuscript</td>\n        <td style="padding:10px 14px;font-weight:600">Testing</td></tr>\n  </table>\n  <p>Our editorial team reads every submission. You can expect to hear from us\n     within <strong>8 weeks</strong>. Please quote your reference\n     number in any correspondence about this submission.</p>\n  <p>We are grateful for the chance to read your work.</p>\n  <p style="color:#6b6559">Kairali Books · കൈരളി ബുക്സ്</p>\n</div>	submission_received	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	sent	0	\N	2026-08-27 07:33:13	2026-08-27 07:33:17
52dfeb30-68a2-48d0-89da-9bb5210ebbb4	developer@megamind.studio	Megamind Connect	Update on your manuscript submission — SUB-2026-0005	Dear Megamind Connect,\n\nThank you for submitting your manuscript "Testing" (Reference: SUB-2026-0005) to Kairali Books.\n\nOur editors have carefully read and considered your work. Regrettably, we have decided not to proceed with publication at this time. We receive many submissions and must make difficult choices based on our current list and publishing schedule.\n\nYou retain all rights to your work, and we encourage you to seek publication elsewhere. We wish you the best of luck with your writing.\n\nSincerely,\nKairali Books	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear Megamind Connect,</p>\n  <p>Thank you for submitting your manuscript "<strong>Testing</strong>" (Reference: SUB-2026-0005) to Kairali Books.</p>\n  <p>Our editors have carefully read and considered your work. Regrettably, we have decided not to proceed with publication at this time. We receive many submissions and must make difficult choices based on our current list and publishing schedule.</p>\n  <p>You retain all rights to your work, and we encourage you to seek publication elsewhere. We wish you the best of luck with your writing.</p>\n  <p style="color:#6b6559">Sincerely,<br>Kairali Books</p>\n</div>	submission_declined	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	sent	0	\N	2026-08-27 07:41:35	2026-08-27 07:41:38
f2a85cb1-bb09-47f8-aea2-2d10ee0d9a1a	developer@megamind.studio	Megamind Connect	Revision requested for your manuscript — SUB-2026-0005	Dear Megamind Connect,\n\nThank you for submitting your manuscript "Testing" (Reference: SUB-2026-0005) to Kairali Books.\n\nOur editors have reviewed your work and see great potential. However, we feel some revisions are needed before we can make a final decision.\n\nEditor's Feedback:\nrevision fre\n\nYou can view this feedback and upload your revised manuscript by logging into your author portal at:\nhttp://localhost:3001/publish/status?ref=SUB-2026-0005&email=developer%40megamind.studio\n\nWe look forward to reading your updated work.\n\nSincerely,\nKairali Books	<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1c1a17;max-width:520px">\n  <p>Dear Megamind Connect,</p>\n  <p>Thank you for submitting your manuscript "<strong>Testing</strong>" (Reference: SUB-2026-0005) to Kairali Books.</p>\n  <p>Our editors have reviewed your work and see great potential. However, we feel some revisions are needed before we can make a final decision.</p>\n  <div style="background:#f7f6f2;border-left:4px solid #b3541e;padding:12px;margin:20px 0;border-radius:0 8px 8px 0">\n    <h4 style="margin:0 0 6px 0;color:#b3541e">Editor's Feedback</h4>\n    <p style="margin:0;white-space:pre-wrap">revision fre</p>\n  </div>\n  <p>You can view this feedback and upload your revised manuscript by logging into your author portal:</p>\n  <p><a href="http://localhost:3001/publish/status?ref=SUB-2026-0005&amp;email=developer%40megamind.studio" style="display:inline-block;background:#0f5d55;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:500">Access Author Portal</a></p>\n  <p>We look forward to reading your updated work.</p>\n  <p style="color:#6b6559">Sincerely,<br>Kairali Books</p>\n</div>	submission_revision	submission	ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	sent	0	\N	2026-08-27 10:44:24	2026-08-27 10:44:28
c60b89d2-57c1-46fb-a21d-418e80e0f635	editor@kairalibooks.in	Editor Staff	Revised manuscript uploaded — SUB-2026-0005	Dear Editor Staff,\n\nThe author of "Testing" (SUB-2026-0005) has uploaded a revised manuscript for your review.\n\nPlease log into the PMS dashboard to review the changes.	\N	\N	\N	\N	sent	0	\N	2026-08-27 10:45:00	2026-08-27 10:45:04
\.


--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.login_attempts (email, failed_count, first_failed_at, last_failed_at, locked_until) FROM stdin;
\.


--
-- Data for Name: payouts; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.payouts (id, author_id, gross_paise, tds_paise, net_paise, paid_on, method, reference, note, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: print_jobs; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.print_jobs (id, job_no, title_id, qty, paper, binding, vendor, cost_paise, status, raised_on, received_on, notes, created_by, created_at) FROM stdin;
e24c4c4d-8949-4da0-a18a-7b92732f3608	JOB-2026-0001	1ba34910-737c-4e1c-a67b-0bd919db0d28	1000	12	12	1212	12200	cancelled	2026-08-11	\N	\N	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:50:34
9e15114c-6a8d-4fc3-8589-1aab82f9bcaf	JOB-2026-0002	1ba34910-737c-4e1c-a67b-0bd919db0d28	1000	100	10	10	12200	completed	2026-08-11	2026-08-11	\N	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:53:41
cbcada3c-cb0d-4ff5-bd91-fb4f5e10f103	JOB-2026-0003	b87c6f62-fc52-4165-9689-7d84514b14b6	1000	12	12	12	300000	completed	2026-08-11	2026-08-11	\N	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:56:41
\.


--
-- Data for Name: production_projects; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.production_projects (id, title_id, status, dtp_assigned_to, dtp_deadline, dtp_completed_at, editing_assigned_to, editing_deadline, editing_completed_at, cover_assigned_to, cover_deadline, cover_completed_at, isbn_assigned_to, isbn_deadline, isbn_completed_at, isbn_registered, proof_assigned_to, proof_deadline, proof_completed_at, proof_feedback, proof_approved_at, print_job_id, print_completed_at, created_at, updated_at, final_layout_path, final_cover_path) FROM stdin;
e6ce923f-866e-49e8-87cf-04ca761a70a2	ddd380e7-4044-4bc9-9d32-39338d9f4cb6	final_proof	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	2026-08-26	2026-08-21 12:16:59	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-26	2026-08-21 12:17:22	f231ceb3-ec79-46b4-b857-431ca1ce216a	2026-08-19	2026-08-21 12:17:22	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-27	2026-08-21 12:17:34	978-81-12345-67-8	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-28	\N	\N	\N	\N	\N	2026-08-21 12:15:04	2026-08-21 12:18:24	2026/08/7fa56296-4c9f-4def-a583-06a866690972.pdf	2026/08/7fa56296-4c9f-4def-a583-06a866690972.pdf
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.sales (id, doc_no, type, channel, dealer_id, customer_name, event_name, discount_pct, subtotal_paise, discount_paise, total_paise, payment_mode, sold_on, return_of_sale_id, notes, created_by, created_at) FROM stdin;
a4b95e44-7cbd-4bca-aee4-ade83aedcc60	INV-2026-0001	sale	retail	\N	Walk-in	\N	0	39900	0	39900	\N	2026-08-11	\N	\N	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	2026-08-11 05:47:21
805c1922-fa34-4af8-be47-bf7ca4a69ba3	INV-2026-0002	sale	dealer	bbf3c938-d7c1-4954-85b1-6e491a0143ed	Jamshad Ali [Megamind]	\N	0	22239900	0	22239900	\N	2026-08-11	\N	\N	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 07:13:01
\.


--
-- Data for Name: sale_lines; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.sale_lines (id, sale_id, title_id, qty, unit_price_paise, discount_pct, line_total_paise) FROM stdin;
64f07e15-4ec5-46c1-bf61-c84a065e616c	a4b95e44-7cbd-4bca-aee4-ade83aedcc60	979dad4c-241f-4fd5-8c41-feb5829a0250	1	39900	0	39900
ea0e5381-59a4-45e5-bfad-a2faad653bbc	805c1922-fa34-4af8-be47-bf7ca4a69ba3	b87c6f62-fc52-4165-9689-7d84514b14b6	1000	22200	0	22200000
3218e6fd-6011-49d9-9075-394a4aac78a6	805c1922-fa34-4af8-be47-bf7ca4a69ba3	979dad4c-241f-4fd5-8c41-feb5829a0250	1	39900	0	39900
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) FROM stdin;
b2c3fa40-c471-4632-9578-aed3d48f3e55	c937247e-12c4-4a09-a6c9-a686a1f05e2a	b40689ba3fc0c5e42e5a0a9576d53bd82815247c8d5786369bcc01680bb974d1	2026-08-27 22:35:28	2026-08-27 10:35:28	2026-08-27 11:27:57
c05ff0b1-b76c-40bf-abf9-12e8ccd79596	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	fcbf76e9d436168ac05d9a3c3f94f0320ca0257eccf4e086351db21b62910ccc	2026-08-27 18:46:19	2026-08-27 06:46:19	2026-08-27 11:28:45
957022c4-5eac-4fb5-9954-8fe99af0da90	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	030d9e4a2ecd7f3ed7280c7365eafac2d3c9efb0c1385e0d54546d14c3eb69ce	2026-08-27 18:42:58	2026-08-27 06:42:58	2026-08-27 11:26:59
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.settings (key, value, updated_at, updated_by) FROM stdin;
submissions.response_weeks	8	2026-08-21 11:10:30	\N
submissions.open	true	2026-08-21 11:10:30	\N
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.stock_movements (id, title_id, qty_delta, reason, ref_type, ref_id, balance_after, note, user_id, at) FROM stdin;
f3131445-404b-48b5-a1e8-808f2553f834	601a5025-4539-4382-9a89-817aa6ffcba7	320	opening	\N	\N	320	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
a97a5111-030c-47c1-b540-ed610f9d4b62	16dc6120-7310-435a-b931-a8de181c1739	85	opening	\N	\N	85	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
ea6459ea-3621-447d-91bf-d3ad9726ffea	06dc884b-b708-4596-89c7-0870ececc7b0	140	opening	\N	\N	140	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
72e4b01c-c12a-42eb-941d-7feb7ed67318	d0f4d094-0bd7-48b4-b627-e22a9bb433ba	412	opening	\N	\N	412	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
9a8e73fc-0537-4b2f-b507-04a312a01f4d	77255abc-b443-4287-8103-bfe4942a6ccd	24	opening	\N	\N	24	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
ca588244-f8ad-4dc9-b06a-88e865605770	2c23dccc-b636-4248-bd20-e6de69a469f6	508	opening	\N	\N	508	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
1a7274ab-3e63-4054-8c99-3ffd42cf50c1	1561c681-35c1-478b-82aa-8ea1c674dd9d	267	opening	\N	\N	267	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
8494fb61-64b9-4a04-8819-c28dca3e29ea	210303bf-5cd1-49e1-963f-ff1ecb0e821f	96	opening	\N	\N	96	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
71c76436-2527-4f6b-962c-07be00486591	15407a62-bd40-4cae-a449-c8c8a3bca801	12	opening	\N	\N	12	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
48d5b572-006a-4aa0-9ba0-055a6550c730	979dad4c-241f-4fd5-8c41-feb5829a0250	740	opening	\N	\N	740	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
f761d905-dd6b-4ae4-b847-649ac0815cf2	01c8a228-f661-4c4e-a806-ac983f43c500	63	opening	\N	\N	63	Opening stock loaded by seed	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 05:27:47
d29396c2-a5e6-4a96-85b4-ee472780a238	979dad4c-241f-4fd5-8c41-feb5829a0250	-1	sale	sale	a4b95e44-7cbd-4bca-aee4-ade83aedcc60	739	INV-2026-0001	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	2026-08-11 05:47:21
8c976f73-73c7-4140-b8cb-ded828bb09a4	1ba34910-737c-4e1c-a67b-0bd919db0d28	1000	print_receipt	print_job	9e15114c-6a8d-4fc3-8589-1aab82f9bcaf	1000	JOB-2026-0002	223b70c0-bc7e-4f7e-b647-2223425ae122	2026-08-11 05:54:14
152f75dc-cfb7-4b61-84bc-e749f49a7306	b87c6f62-fc52-4165-9689-7d84514b14b6	1000	print_receipt	print_job	cbcada3c-cb0d-4ff5-bd91-fb4f5e10f103	1000	JOB-2026-0003	223b70c0-bc7e-4f7e-b647-2223425ae122	2026-08-11 05:57:26
2148114a-0fae-42cc-9a95-115dfe2824a3	b87c6f62-fc52-4165-9689-7d84514b14b6	-1000	sale	sale	805c1922-fa34-4af8-be47-bf7ca4a69ba3	0	INV-2026-0002	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 07:13:01
316ad7b4-5e03-4515-bb57-c71f5fbeeb8c	979dad4c-241f-4fd5-8c41-feb5829a0250	-1	sale	sale	805c1922-fa34-4af8-be47-bf7ca4a69ba3	738	INV-2026-0002	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	2026-08-11 07:13:01
\.


--
-- Data for Name: submission_throttle; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.submission_throttle (ip_hash, count, window_start, last_at) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: kairali_pms; Owner: mm-developer01
--

COPY kairali_pms.submissions (id, ref_no, author_name, author_name_ml, email, phone, place, title, title_ml, genre, language, synopsis, manuscript_path, manuscript_filename, manuscript_size, manuscript_mime, status, source, reviewed_by, review_notes, decided_on, submitted_at, updated_at, publishing_type, assigned_at) FROM stdin;
981f714f-9f38-4e70-8504-2fbee532dcca	SUB-2026-0001	Jamshad Ali [Megamind]	\N	developer@megamind.studio	07012257903	manglore	dwe	\N	short_stories	Malayalam	dewdewdwedwedewdewqewdqdeweqdweqdwqedewqdewqdweqdweqdweddqweedqwdqweedwdewqdewdewdewewdewewedeededwqdewqedw	2026/08/601c7828-e6dc-47ed-8f95-bd45f6e2f7ef.pdf	cloudflare-upgrade-proposal.pdf	131227	application/pdf	new	web	\N	\N	\N	2026-08-21 11:47:19	2026-08-21 11:47:19	\N	\N
eb53c2bd-1d0e-49d8-85bf-cff9420f9906	SUB-2026-0002	James Clear	\N	james@example.com	\N	\N	dewd	\N	novel	Malayalam	dweewdwedewdqedwA book about building good habits and breaking bad ones. It provides a comprehensive guide on how to change your habits and get 1% better every day.	2026/08/7fa56296-4c9f-4def-a583-06a866690972.pdf	cloudflare-upgrade-proposal.pdf	131227	application/pdf	accepted	web	a4ffecd1-7674-4d8e-9f02-dd924eebfb81	\N	2026-08-21 12:13:35	2026-08-21 12:11:49	2026-08-21 12:13:35	kairali_funded	2026-08-21 12:11:49
240602d2-3229-4ae7-9caa-df7cd3da72d8	SUB-2026-0003	Dr. K. S. Radhakrishnan	\N	ks.radhakrishnan@example.com	+91 94470 12345	Kottayam	Kerala Charithram: Naveena Kazhchakal	\N	essays	Malayalam	An insightful contemporary historical evaluation of 20th century Kerala socio-political reformation movements, cultural renaissance, and modern literary developments across various districts in Kerala.	2026/08/8f4b3784-0a83-4b69-919d-7059db04a6e8.pdf	sample_manuscript.pdf	85	application/pdf	new	web	223b70c0-bc7e-4f7e-b647-2223425ae122	\N	\N	2026-08-27 06:59:33	2026-08-27 06:59:33	\N	2026-08-27 06:59:33
d0a8fcc7-6c34-44d2-a7fc-1fd2138ce3d8	SUB-2026-0004	Dr. K. S. Radhakrishnan	\N	akamliveconnect@gmail.com	+91 94470 12345	Kottayam	Kerala Charithram: Naveena Kazhchakal	\N	essays	Malayalam	An insightful contemporary historical evaluation of 20th century Kerala socio-political reformation movements, cultural renaissance, and modern literary developments across various districts in Kerala.	2026/08/2774bb7b-fec5-4a6b-93fc-18f7a81b758b.pdf	sample_manuscript.pdf	85	application/pdf	new	web	2ecfdda7-cf9d-4469-9999-8a315cc0d27a	\N	\N	2026-08-27 07:18:32	2026-08-27 07:18:32	\N	2026-08-27 07:18:32
ac2e154d-aee4-4d5b-a4ce-8d32410a4f8f	SUB-2026-0005	Megamind Connect	\N	developer@megamind.studio	+919446669023	Manglore	Testing	\N	short_stories	Malayalam	ferferferfferwfreefrwefrwerfwerfwefrwfrewfrewrefwerfefrwefrerfwerfwerfwefrwefrwferferfrefreefrrffreerf	2026/08/722a8248-daf3-48b3-af95-9e9ef035168c.pdf	Invoice-VAOSPY5R-0008.pdf	34713	application/pdf	under_review	web	c937247e-12c4-4a09-a6c9-a686a1f05e2a	revision fre	2026-08-27 07:41:35	2026-08-27 07:33:13	2026-08-27 10:45:00	\N	2026-08-27 10:36:29
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: mm-developer01
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--

\unrestrict mW0El3EVmwkKuMLaS5bBja5uHHB4BMiix58BCgFUYDij5MMhiMyMsW2GEYoYX3O


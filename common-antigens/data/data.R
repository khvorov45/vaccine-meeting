library(tidyverse)

# SECTION CBER

cber_filename <- "data-raw/CBER/CBER-Spring 2021_Summary.xlsx"

cber_raw_h1 <- readxl::read_excel(cber_filename, "H1_HAI")

cber_raw_bvic <- readxl::read_excel(cber_filename, "B_Vic HAI")

cber_raw_h3 <- readxl::read_excel(cber_filename, "H3_MN")

fun_cber_process <- function(cber_raw, subtype_name) {
  cber_raw %>%
    rename(
      sample_id = `Sample ID`, sample_source = SOURCE, cohort = COHORT
    ) %>%
    select(-VACCINE) %>%
    pivot_longer(
      c(-cohort, -sample_source, -sample_id),
      names_to = "virus", values_to = "titre"
    ) %>%
    mutate(
      subtype = subtype_name,
      timepoint = if_else(str_detect(virus, "S1$"), "Pre-vax", "Post-vax"),
      egg_cell = if_else(str_detect(virus, "EGG"), "Egg", "Cell"),
      cohort = recode(
        cohort,
        "Ped (3-8 yr)" = "Pediatric", "Ped (9-17 yr)" = "Pediatric",
        "Adult (18-49 yr)" = "Adult"
      ),
      virus = str_replace(virus, "_EGG_S[1|2]$", "") %>%
        str_replace("_CELL_S[1|2]$", "") %>%
        str_trim() %>%
        recode("B/Lebanon/16/2020 c" = "B/Lebanon/16/2020"),
      sample_source = recode(
        sample_source,
        "US CBER" = "CBER", "US CDC" = "CDC", "JAPAN" = "NIID"
      ),
      testing_lab = "CBER",
      sample_id = as.character(sample_id)
    )
}

cber <- imap_dfr(
  list("H1" = cber_raw_h1, "BVic" = cber_raw_bvic, "H3" = cber_raw_h3),
  fun_cber_process
)

unique(cber$virus)
unique(cber$sample_source)
unique(cber$testing_lab)
unique(cber$titre)
unique(cber$sample_id)

# SECTION CNIC

cnic_raw <- readxl::read_excel("data-raw/CNIC/CNIC-H3N2 MN result.xlsx")

cnic <- cnic_raw %>%
  rename(
    testing_lab = `WHO TESTING LAB`, sample_source = LOCATION, cohort = COHORT,
    sample_id = `PATIENT ID`
  ) %>%
  select(-contains("AGE"), -VACCINE) %>%
  pivot_longer(
    c(-cohort, -testing_lab, -sample_source, -sample_id),
    names_to = "virus", values_to = "titre"
  ) %>%
  mutate(
    subtype = "H3",
    timepoint = if_else(str_detect(virus, "S1$"), "Pre-vax", "Post-vax"),
    egg_cell = if_else(str_detect(virus, "EGG"), "Egg", "Cell"),
    cohort = tolower(cohort) %>% tools::toTitleCase(),
    virus = str_replace(virus, "[_|\\s]EGG[_|\\s]S[1|2]$", "") %>%
      str_replace("[_|\\s]SIAT[_|\\s]S[1|2]$", "") %>%
      tools::toTitleCase()
  ) %>%
  filter(!is.na(cohort))

unique(cnic$testing_lab)
unique(cnic$sample_source)
unique(cnic$titre)
unique(cnic$sample_id)

setdiff(cnic$virus, cber$virus)
setdiff(cber$virus, cnic$virus)

unique(cnic$subtype)
unique(cber$subtype)

unique(cnic$egg_cell)
unique(cber$egg_cell)

unique(cnic$cohort)
unique(cber$cohort)

unique(cnic$timepoint)
unique(cber$timepoint)

# SECTION NIBSC

nibsc_raw_b_one <- read_csv(
  "data-raw/NIBSC/HI B NH2021-22 RAW DATA.csv",
  col_types = cols()
)

nibsc_raw_b_add <- read_csv(
  "data-raw/NIBSC/HI B NH2021-22 RAW DATA ADDITONAL RUN.csv",
  col_types = cols()
)

nibsc_raw_h1 <- read_csv(
  "data-raw/NIBSC/HI H1 NH2021-22 RAW DATA.csv",
  col_types = cols()
)

nibsc_raw_h3 <- read_csv(
  "data-raw/NIBSC/HI H3 NH2021-22 RAW DATA corrected.csv",
  col_types = cols()
)

# NOTE(sen) add is a superset but they also re-tested all the samples apparently
nrow(nibsc_raw_b_one)
nrow(nibsc_raw_b_add)
nibsc_raw_b <- nibsc_raw_b_add

fun_nibsc_process <- function(nibsc_raw, subtype_name) {
  nibsc_raw %>%
    rename(
      cohort = Age, virus = Strain, egg_cell = `Egg/Cell`,
      `Pre-vax` = Before, `Post-vax` = After, sample_source = Country,
      sample_id = ID
    ) %>%
    select(-Method) %>%
    pivot_longer(
      c(`Pre-vax`, `Post-vax`),
      names_to = "timepoint", values_to = "titre"
    ) %>%
    mutate(
      subtype = subtype_name,
      cohort = recode(
        cohort,
        "Paediatric" = "Pediatric",
        "Peadiatric" = "Pediatric"
      ),
      virus = str_replace(virus, "Rhode/Island", "Rhode Island"),
      testing_lab = "NIBSC",
      titre = case_when(
        titre == 640320 ~ 320,
        titre == 604 ~ 640,
        titre == 32 ~ 320,
        titre == 30 ~ 320,
        titre == 120 ~ 1280,
        TRUE ~ titre
      ),
      sample_id = as.character(sample_id)
    ) %>%
    filter(cohort != "Flubloc")
}

nibsc <- imap_dfr(
  list("H1" = nibsc_raw_h1, "BVic" = nibsc_raw_b, "H3" = nibsc_raw_h3),
  fun_nibsc_process
)

unique(nibsc$sample_source)
unique(nibsc$testing_lab)
unique(nibsc$titre)
unique(nibsc$sample_id)

setdiff(nibsc$virus, cber$virus)
setdiff(cber$virus, nibsc$virus)

setdiff(nibsc$virus, cnic$virus)
setdiff(cnic$virus, nibsc$virus)

unique(nibsc$subtype)
unique(cber$subtype)

unique(nibsc$egg_cell)
unique(cber$egg_cell)

unique(nibsc$cohort)
unique(cber$cohort)

unique(nibsc$timepoint)
unique(cber$timepoint)

# SECTION NIID

niid_bvic_raw <- readxl::read_excel(
  "data-raw/NIID/CDC formats filled by NIID HI_BVic 2021winter.xlsx"
)

niid_h1_raw <- readxl::read_excel(
  "data-raw/NIID/CDC formats filled by NIID HI_H1pdm Sep 2021.xlsx"
)

niid_h3_raw <- readxl::read_excel(
  "data-raw/NIID/CDC formats filled by NIID MNT Sep 2021.xlsx"
)

fun_niid_process <- function(niid_raw, subtype_name) {
  niid_raw %>%
    rename(
      cohort = COHORT, testing_lab = `WHO TESTING LAB`,
      sample_source = LOCATION, sample_id = `PATIENT ID`
    ) %>%
    select(-contains("AGE"), -VACCINE) %>%
    pivot_longer(
      c(-cohort, -testing_lab, -sample_source, -sample_id),
      names_to = "virus", values_to = "titre"
    ) %>%
    mutate(
      subtype = subtype_name,
      cohort = tolower(cohort) %>% tools::toTitleCase(),
      timepoint = if_else(str_detect(virus, "S1$"), "Pre-vax", "Post-vax"),
      egg_cell = if_else(str_detect(virus, "Egg"), "Egg", "Cell"),
      virus = str_replace_all(virus, "\n|\r", "") %>%
        str_replace("[\\s|_]?Egg[\\s|_]S[1|2]$", "") %>%
        str_replace("[\\s|_]?Cell[\\s|_]S[1|2]$", "") %>%
        str_replace("[\\s|_]?hCK[\\s|_]S[1|2]$", "") %>%
        str_replace("[\\s|_]?SIAT[\\s|_]S[1|2]$", "") %>%
        str_replace("/(\\d{2})$", "/20\\1"),
      virus = if_else(str_detect(virus, "^A/"), virus, paste0("B/", virus)) %>%
        recode(
          "B/Rhode Ishland/01/2019" = "B/Rhode Island/01/2019",
          "A/Cambodia/e08xx/220" = "A/Cambodia/E0826360/2020"
        )
    ) %>%
    filter(!is.na(titre))
}

niid <- imap_dfr(
  list("H1" = niid_h1_raw, "BVic" = niid_bvic_raw, "H3" = niid_h3_raw),
  fun_niid_process
)

unique(niid$testing_lab)
unique(niid$sample_source)
unique(niid$titre)
unique(niid$sample_id)

setdiff(niid$virus, cber$virus)
setdiff(cber$virus, niid$virus)

setdiff(niid$virus, cnic$virus)
setdiff(cnic$virus, niid$virus)

setdiff(niid$virus, nibsc$virus)
setdiff(nibsc$virus, niid$virus)

unique(niid$subtype)
unique(cber$subtype)

unique(niid$egg_cell)
unique(cber$egg_cell)

unique(niid$cohort)
unique(cber$cohort)

unique(niid$timepoint)
unique(cber$timepoint)

# SECTION VIDRL

vidrl_hi_raw <- read_csv("data-raw/VIDRL/hi202102.csv", col_types = cols())
vidrl_mn_raw <- read_csv("data-raw/VIDRL/mn202102.csv", col_types = cols())

unique(vidrl_hi_raw$Influenza_Type)
unique(vidrl_mn_raw$Influenza_Type)
unique(vidrl_hi_raw$Titre_wk0)
unique(vidrl_hi_raw$Titre_wk4)
unique(vidrl_mn_raw$Titre_wk0)
unique(vidrl_mn_raw$Titre_wk4)

vidrl_raw <- bind_rows(
  # NOTE(sen) I've decided that this is what these titres mean
  vidrl_hi_raw %>%
    mutate(across(contains("Titre"), ~ 5 * 2^(.x))),
  vidrl_mn_raw %>%
    mutate(across(
      contains("Titre"),
      ~ recode(.x, "<10" = "5", ">1280" = "1280") %>% as.numeric()
    ))
)

vidrl <- vidrl_raw %>%
  rename(
    virus = Test_Antigen, egg_cell = Type,
    `Pre-vax` = Titre_wk0, `Post-vax` = Titre_wk4,
    subtype = Influenza_Type, cohort = Agegroup,
    sample_source = Centre, sample_id = Serum_No
  ) %>%
  select(-Passage_hist, -Vax) %>%
  filter(!is.na(`Pre-vax`)) %>%
  pivot_longer(
    c(`Pre-vax`, `Post-vax`),
    names_to = "timepoint", values_to = "titre"
  ) %>%
  mutate(
    subtype = recode(subtype, "H1N1" = "H1", "Vic" = "BVic", "Yam" = "BYam"),
    cohort = recode(cohort, "Older Adult" = "Adult", "Paed" = "Pediatric"),
    virus =
      recode(virus, "A/Cambodia/e0826360/2020" = "A/Cambodia/E0826360/2020"),
    testing_lab = "VIDRL",
    sample_source =
      recode(sample_source, "US" = "CBER", "UK" = "NIBSC", "China" = "CNIC")
  ) %>%
  filter(!is.na(titre))

unique(vidrl$testing_lab)
unique(vidrl$sample_source)
unique(vidrl$titre)
unique(vidrl$sample_id)

setdiff(vidrl$virus, cber$virus)
setdiff(cber$virus, vidrl$virus)

setdiff(vidrl$virus, cnic$virus)
setdiff(cnic$virus, vidrl$virus)

setdiff(vidrl$virus, nibsc$virus)
setdiff(nibsc$virus, vidrl$virus)

setdiff(vidrl$virus, niid$virus)
setdiff(niid$virus, vidrl$virus)

unique(vidrl$subtype)
unique(cber$subtype)

unique(vidrl$egg_cell)
unique(cber$egg_cell)

unique(vidrl$cohort)
unique(cber$cohort)

unique(vidrl$timepoint)
unique(cber$timepoint)

combined <- bind_rows(list(cber, cnic, nibsc, niid, vidrl))

# NOTE(sen) Which antigens are common?
combined %>%
  group_by(testing_lab) %>%
  group_map(~ unique(.x$virus)) %>%
  reduce(~ intersect(.x, .y))

# NOTE(sen) Which labs have which samples?
combined %>%
  group_by(testing_lab, subtype) %>%
  group_walk(~ cat(glue::glue(
    "{.y$testing_lab} {.y$subtype}: {paste(unique(.x$sample_source), collapse = ' ')}\n\n"
  )))

# NOTE(sen) Can we figure out which samples are which?
combined %>%
  group_by(testing_lab, sample_source) %>%
  summarise(.groups = "drop", ids = paste(unique(sample_id), collapse = " | ")) %>%
  write_csv("data/sample-ids.csv")

unique(combined$sample_source)
unique(combined$testing_lab)

write_csv(combined, "data/combined.csv")

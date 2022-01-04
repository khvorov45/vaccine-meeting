library(tidyverse)

# SECTION CBER

cber_filename <- "data-raw/CBER.xlsx"
cber_raw_h1 <- readxl::read_excel(cber_filename, "H1_HAI")
cber_raw_bvic <- readxl::read_excel(cber_filename, "B_Vic HAI")
cber_raw_h3 <- readxl::read_excel(cber_filename, "H3_MN")

cber <- imap_dfr(
  list("H1" = cber_raw_h1, "BVic" = cber_raw_bvic, "H3" = cber_raw_h3),
  function(cber_raw, subtype_name) {
    cber_raw %>%
      rename(
        serum_id = `Sample ID`, serum_source = SOURCE, cohort = COHORT
      ) %>%
      select(-VACCINE) %>%
      pivot_longer(
        c(-cohort, -serum_source, -serum_id),
        names_to = "virus", values_to = "titre"
      ) %>%
      mutate(
        subtype = subtype_name,
        timepoint = if_else(str_detect(virus, "S1$"), "Pre-vax", "Post-vax"),
        egg_cell = if_else(str_detect(virus, "EGG"), "Egg", "Cell"),
        virus = str_replace(virus, "_EGG_S[1|2]$", "") %>%
          str_replace("_CELL_S[1|2]$", "") %>%
          str_replace("_SIAT_S[1|2]$", "") %>%
          str_replace(" \\(H3N2\\)$", "") %>%
          str_trim(),
        serum_source = recode(
          serum_source,
          "US CBER" = "US", "US CDC" = "US", "JAPAN" = "Japan",
          "AUS VIDRL" = "Australia"
        ),
        testing_lab = "CBER",
        serum_id = as.character(serum_id)
      )
  }
)

print_unique <- function(data) {
  iwalk(data %>% select(-serum_id), ~ cat(.y, "\n\t", paste(sort(unique(.x)), collapse = "\n\t"), "\n", sep = ""))
}

print_unique(cber)

# SECTION CNIC

cnic_raw_h3 <- readxl::read_excel("data-raw/CNIC-H3-HI.xlsx")
cnic_raw_h1 <- readxl::read_excel("data-raw/CNIC-HI.xlsx", "H1pdm")
cnic_raw_bvic <- readxl::read_excel("data-raw/CNIC-HI.xlsx", "B-Vic")

cnic <- imap_dfr(
  list("H1" = cnic_raw_h1, "BVic" = cnic_raw_bvic, "H3" = cnic_raw_h3),
  function(cnic_raw, subtype_name) {
    cnic_raw %>%
      rename(
        testing_lab = `WHO TESTING LAB`, serum_source = LOCATION, cohort = COHORT,
        serum_id = `PATIENT ID`
      ) %>%
      select(-contains("AGE"), -VACCINE) %>%
      pivot_longer(
        c(-cohort, -testing_lab, -serum_source, -serum_id),
        names_to = "virus", values_to = "titre"
      ) %>%
      mutate(
        subtype = subtype_name,
        timepoint = if_else(str_detect(virus, "S1$"), "Pre-vax", "Post-vax"),
        egg_cell = if_else(str_detect(virus, "EGG"), "Egg", "Cell"),
        # NOTE(sen) This is a guess
        cohort = tolower(cohort) %>% tools::toTitleCase() %>%
          recode("Adult" = "Adult (18-64 yr)", "Elderly" = "Elderly (>=65 yr)"),
        serum_source = recode(serum_source, "VIDRL" = "Australia"),
        virus = str_replace(virus, "[_|\\s]EGG[_|\\s]S[1|2]$", "") %>%
          str_replace("[_|\\s]SIAT[_|\\s]S[1|2]$", "") %>%
          str_replace("[_|\\s]mdck[_|\\s]S[1|2]$", "") %>%
          str_replace("[_|\\s]MDCK[_|\\s]S[1|2]$", "") %>%
          tools::toTitleCase() %>%
          str_trim() %>%
          recode("A/Nepal/NPWR-05637/202" = "A/Nepal/NPWR-05637/2021"),
      ) %>%
      filter(!is.na(cohort))
  }
)

print_unique(cnic)

setdiff(cnic$serum_source, cber$serum_source)
setdiff(cber$serum_source, cnic$serum_source)

setdiff(cnic$cohort, cber$cohort)
setdiff(cber$cohort, cnic$cohort)

setdiff(cnic$subtype, cber$subtype)
setdiff(cber$subtype, cnic$subtype)

setdiff(cnic$timepoint, cber$timepoint)
setdiff(cber$timepoint, cnic$timepoint)

setdiff(cnic$egg_cell, cber$egg_cell)
setdiff(cber$egg_cell, cnic$egg_cell)

setdiff(cnic$virus, cber$virus)
setdiff(cber$virus, cnic$virus)

cber_cnic <- bind_rows(cber, cnic)

print_unique(cber_cnic)

# SECTION NIBSC

nibsc_raw_h3 <- readxl::read_excel("data-raw/NIBSC-H3-HI.xlsx")
nibsc_raw_h1 <- readxl::read_excel("data-raw/NIBSC-H1-HI.xlsx")
nibsc_raw_bvic <- readxl::read_excel("data-raw/NIBSC-B-vic-HI.xlsx")

nibsc <- bind_rows(
  nibsc_raw_h3 %>% mutate(subtype = "H3"),
  nibsc_raw_h1 %>% mutate(subtype = "H1"),
  nibsc_raw_bvic %>% mutate(subtype = "BVic"),
) %>%
  rename(
    cohort = Age, virus = Strain, egg_cell = `Egg/Cell`,
    `Pre-vax` = Before, `Post-vax` = After, serum_source = Country,
    serum_id = ID
  ) %>%
  select(-Method) %>%
  pivot_longer(
    c(`Pre-vax`, `Post-vax`),
    names_to = "timepoint", values_to = "titre"
  ) %>%
  mutate(
    cohort = recode(
      cohort,
      # NOTE(sen) These are guesses
      "Paediatric" = "Ped (<18 yr)",
      "Adult" = "Adult (18-64 yr)",
      "Elderly" = "Elderly (>=65 yr)"
    ),
    testing_lab = "NIBSC",
    serum_source = recode(serum_source, "CBER" = "US"),
    serum_id = as.character(serum_id),
    virus = str_replace(virus, "Sichuan Jingyang", "Sichuan-Jingyang")
  )

print_unique(nibsc)

setdiff(nibsc$serum_source, cber_cnic$serum_source)
setdiff(cber_cnic$serum_source, nibsc$serum_source)

setdiff(nibsc$cohort, cber_cnic$cohort)
setdiff(cber_cnic$cohort, nibsc$cohort)

setdiff(nibsc$subtype, cber_cnic$subtype)
setdiff(cber_cnic$subtype, nibsc$subtype)

setdiff(nibsc$timepoint, cber_cnic$timepoint)
setdiff(cber_cnic$timepoint, nibsc$timepoint)

setdiff(nibsc$egg_cell, cber_cnic$egg_cell)
setdiff(cber_cnic$egg_cell, nibsc$egg_cell)

setdiff(nibsc$virus, cber_cnic$virus)
setdiff(cber_cnic$virus, nibsc$virus)

cber_cnic_nibsc <- bind_rows(cber_cnic, nibsc)

print_unique(cber_cnic_nibsc)

# SECTION NIID

niid_raw_h3 <- readxl::read_excel("data-raw/NIID-H3-MN.xlsx")
niid_raw_h1 <- readxl::read_excel("data-raw/NIID-H1-HI.xlsx", "A1by NIID HI_H1pdm VIDRL panels")
niid_raw_bvic <- readxl::read_excel("data-raw/NIID-H1-HI.xlsx", "A1by NIID HI_BVic VIDRL panels")

niid <- imap_dfr(
  list("H1" = niid_raw_h1, "BVic" = niid_raw_bvic, "H3" = niid_raw_h3),
  function(niid_raw, subtype_name) {
    niid_raw %>%
      rename(
        cohort = COHORT, testing_lab = `WHO TESTING LAB`,
        serum_source = LOCATION, serum_id = `PATIENT ID`
      ) %>%
      select(-contains("AGE"), -VACCINE) %>%
      pivot_longer(
        c(-cohort, -testing_lab, -serum_source, -serum_id),
        names_to = "virus", values_to = "titre"
      ) %>%
      mutate(
        subtype = subtype_name,
        cohort = tolower(cohort) %>% tools::toTitleCase() %>%
          recode(
            # NOTE(sen) The data has actual age values, so this is correct
            "Adult" = "Adult (18-64 yr)",
            "Elderly" = "Elderly (>=65 yr)",
          ),
        timepoint = if_else(str_detect(virus, "S1$"), "Pre-vax", "Post-vax"),
        egg_cell = if_else(str_detect(virus, "Egg"), "Egg", "Cell"),
        serum_source = recode(serum_source, "VIDRL" = "Australia"),
        virus = str_replace_all(virus, "\n|\r", "") %>%
          str_replace("[\\s|_]?Egg[\\s|_]S[1|2]$", "") %>%
          str_replace("[\\s|_]?Cell[\\s|_]S[1|2]$", "") %>%
          str_replace("[\\s|_]?hCK[\\s|_]S[1|2]$", "") %>%
          str_replace("[\\s|_]?SIAT[\\s|_]S[1|2]$", "") %>%
          str_replace("[\\s|_]?SIAT\\+$", "") %>%
          str_replace("/(\\d{2})$", "/20\\1") %>%
          str_replace("NAGASAKI", "Nagasaki") %>%
          str_replace("Rhode Ishland", "Rhode Island") %>%
          str_trim()
      ) %>%
      filter(!is.na(titre))
  }
)

print_unique(niid)

setdiff(niid$serum_source, cber_cnic_nibsc$serum_source)
setdiff(cber_cnic_nibsc$serum_source, niid$serum_source)

setdiff(niid$cohort, cber_cnic_nibsc$cohort)
setdiff(cber_cnic_nibsc$cohort, niid$cohort)

setdiff(niid$subtype, cber_cnic_nibsc$subtype)
setdiff(cber_cnic_nibsc$subtype, niid$subtype)

setdiff(niid$timepoint, cber_cnic_nibsc$timepoint)
setdiff(cber_cnic_nibsc$timepoint, niid$timepoint)

setdiff(niid$egg_cell, cber_cnic_nibsc$egg_cell)
setdiff(cber_cnic_nibsc$egg_cell, niid$egg_cell)

setdiff(niid$virus, cber_cnic_nibsc$virus)
setdiff(cber_cnic_nibsc$virus, niid$virus)

cber_cnic_nibsc_niid <- bind_rows(cber_cnic_nibsc, niid)

print_unique(cber_cnic_nibsc_niid)

# SECTION VIDRL

vidrl_raw <- readxl::read_excel("data-raw/VIDRL.xlsx")

vidrl <- vidrl_raw %>%
  rename(
    timepoint = S, testing_lab = `WHO TESTING LAB`,
    subtype = Influenza_Type, cohort = COHORT,
    serum_source = LOCATION, serum_id = `PATIENT ID`
  ) %>%
  select(-VACCINE, -assay) %>%
  pivot_longer(
    c(-subtype, -testing_lab, -serum_source, -cohort, -serum_id, -timepoint),
    names_to = "virus", values_to = "titre"
  ) %>%
  filter(!is.na(titre)) %>%
  mutate(
    subtype = recode(subtype, "H1N1" = "H1", "BVIC" = "BVic"),
    titre = if_else(titre < 5, 5, titre),
    egg_cell = str_replace(virus, ".*_(cell|[e|E]gg)$", "\\1") %>% tools::toTitleCase(),
    virus = str_replace(virus, "(.*)_(cell|[e|E]gg)$", "\\1") %>%
      str_replace("HongKong", "Hong Kong") %>%
      recode(
        "A/Cambodia/e0826360/2020" = "A/Cambodia/E0826360/2020",
        "B/Paris/9878/2021" = "B/Paris/9878/2020"
      ),
    timepoint = recode(timepoint, "1" = "Pre-vax", "2" = "Post-vax"),
    cohort = str_replace(cohort, "Paed", "Ped") %>%
      recode(
        "Ped 0-36m" = "Ped (<3 yr)",
        "Ped 3-8y" = "Ped (3-8 yr)",
        "Ped 9-17y" = "Ped (9-17 yr)",
        # NOTE(sen) Guessing
        "Ped" = "Ped (<18 yr)",
        "Adult" = "Adult (18-64 yr)",
        "Elderly" = "Elderly (>=65 yr)",
      ),
    serum_source = recode(serum_source, "VIDRL" = "Australia", "CNIC" = "China"),
  )

print_unique(vidrl)

setdiff(vidrl$serum_source, cber_cnic_nibsc_niid$serum_source)
setdiff(cber_cnic_nibsc_niid$serum_source, vidrl$serum_source)

setdiff(vidrl$cohort, cber_cnic_nibsc_niid$cohort)
setdiff(cber_cnic_nibsc_niid$cohort, vidrl$cohort)

setdiff(vidrl$subtype, cber_cnic_nibsc_niid$subtype)
setdiff(cber_cnic_nibsc_niid$subtype, vidrl$subtype)

setdiff(vidrl$timepoint, cber_cnic_nibsc_niid$timepoint)
setdiff(cber_cnic_nibsc_niid$timepoint, vidrl$timepoint)

setdiff(vidrl$egg_cell, cber_cnic_nibsc_niid$egg_cell)
setdiff(cber_cnic_nibsc_niid$egg_cell, vidrl$egg_cell)

setdiff(vidrl$virus, cber_cnic_nibsc_niid$virus)
setdiff(cber_cnic_nibsc_niid$virus, vidrl$virus)

cber_cnic_nibsc_niid_vidrl <- bind_rows(cber_cnic_nibsc_niid, vidrl)

print_unique(cber_cnic_nibsc_niid_vidrl)

# SECTION CDC

cdc_raw_h3 <- readxl::read_excel("data-raw/CDC-H3-MN.xlsx")

cdc_raw_h1_base <- readxl::read_excel("data-raw/CDC-H1-HI.xlsx", "Base")
cdc_raw_h1_addendum <- readxl::read_excel("data-raw/CDC-H1-HI.xlsx", "Addendum")
cdc_raw_h1_correction <- readxl::read_excel("data-raw/CDC-H1-HI.xlsx", "Correction")

cdc_raw_bvic <- readxl::read_excel("data-raw/CDC-B-vic-HI.xlsx", "Sheet1")

cdc_united <- imap_dfr(
  list(
    "H3" = cdc_raw_h3 %>% rename(`WHO TESTING LAB` = WHO_TESTING_LAB, `Patient ID` = PATIENT_ID) %>% mutate(CSID = 1),
    "H1-base" = cdc_raw_h1_base, "H1-addendum" = cdc_raw_h1_addendum,
    "H1-correction" = cdc_raw_h1_correction, "BVic" = cdc_raw_bvic
  ),
  function(cdc_raw, subtype_name) {
    cdc_raw %>%
      rename(
        timepoint = A_C, testing_lab = `WHO TESTING LAB`,
        cohort = COHORT,
        serum_source = LOCATION, serum_id = `Patient ID`
      ) %>%
      select(-contains("AGE_"), -VACCINE, -CSID) %>%
      mutate(
        subtype = subtype_name,
        across(c(-timepoint, -testing_lab, -cohort, -serum_source, -serum_id, -subtype), as.character)
      ) %>%
      pivot_longer(
        c(-timepoint, -testing_lab, -cohort, -serum_source, -serum_id, -subtype),
        names_to = "virus", values_to = "titre"
      ) %>%
      filter(!is.na(titre)) %>%
      mutate(
        cohort = tools::toTitleCase(tolower(cohort)) %>%
          str_replace("Pediatric", "Ped") %>%
          recode(
            "Ped 6-35m" = "Ped (<3 yr)",
            "Ped 3-8y" = "Ped (3-8 yr)",
            "Ped 9-17y" = "Ped (9-17 yr)",
            "Older Adult 50-64yr" = "Adult (50-64 yr)",
            "Elderly > 65yr" = "Elderly (>=65 yr)",
            # NOTE(sen) Age values in data, so this is correct
            "Ped" = "Ped (<3 yr)",
            "Adult" = "Adult (18-64 yr)",
            "Elderly" = "Elderly (>=65 yr)",
          ),
        egg_cell = if_else(str_detect(tolower(virus), "egg$"), "Egg", "Cell"),
        timepoint = recode(timepoint, "S1" = "Pre-vax", "S2" = "Post-vax"),
        serum_source = recode(serum_source, "USA" = "US", "AUSTRALIA" = "Australia"),
        virus = tolower(virus) %>%
          tools::toTitleCase() %>%
          str_replace("^a/", "A/") %>%
          str_replace("^b/", "B/") %>%
          str_replace("_(egg|siat)$", "") %>%
          str_replace("-Egg$", "") %>%
          str_replace("_mdck$", "") %>%
          recode(
            "A/North_carolina/01/2021" = "A/North Carolina/01/2021",
            "A/Guangdong-Maonan/1536/2019" = "A/Guangdong-Maonan/SWL1536/2019"
          ),
        titre = as.numeric(titre)
      )
  }
)

cdc_h1_duplicates <- cdc_united %>%
  filter(str_starts(subtype, "H1-")) %>%
  mutate(
    subsource = str_replace(subtype, "H1-([[:alpha:]]*)$", "\\1"),
    subtype = "H1",
  ) %>%
  group_by(testing_lab, serum_source, cohort, serum_id, timepoint, subtype, virus, egg_cell)

cdc_h1_no_duplicates_only <- cdc_h1_duplicates %>%
  filter(n() == 1) %>%
  ungroup() %>%
  select(-subsource)

cdc_h1_extra_corrections <- cdc_h1_duplicates %>%
  filter(n() > 1, "correction" %in% subsource) %>%
  filter(subsource == "correction") %>%
  ungroup() %>%
  select(-subsource)

cdc_h1_no_duplicates_with_corrections <- bind_rows(cdc_h1_no_duplicates_only, cdc_h1_extra_corrections)

cdc_h1_extra_addendum <- cdc_h1_duplicates %>%
  filter(n() > 1, !"correction" %in% subsource) %>%
  filter(subsource == "addendum") %>%
  ungroup() %>%
  select(-subsource)

cdc_h1_no_duplicates <- bind_rows(cdc_h1_no_duplicates_with_corrections, cdc_h1_extra_addendum)

cdc_h1_no_duplicates %>%
  group_by(testing_lab, serum_source, cohort, serum_id, timepoint, subtype, virus, egg_cell) %>%
  filter(n() > 1)

cdc <- cdc_united %>%
  filter(!str_starts(subtype, "H1-")) %>%
  bind_rows(cdc_h1_no_duplicates)

print_unique(cdc)

setdiff(cdc$serum_source, cber_cnic_nibsc_niid_vidrl$serum_source)
setdiff(cber_cnic_nibsc_niid_vidrl$serum_source, cdc$serum_source)

setdiff(cdc$cohort, cber_cnic_nibsc_niid_vidrl$cohort)
setdiff(cber_cnic_nibsc_niid_vidrl$cohort, cdc$cohort)

setdiff(cdc$subtype, cber_cnic_nibsc_niid_vidrl$subtype)
setdiff(cber_cnic_nibsc_niid_vidrl$subtype, cdc$subtype)

setdiff(cdc$timepoint, cber_cnic_nibsc_niid_vidrl$timepoint)
setdiff(cber_cnic_nibsc_niid_vidrl$timepoint, cdc$timepoint)

setdiff(cdc$egg_cell, cber_cnic_nibsc_niid_vidrl$egg_cell)
setdiff(cber_cnic_nibsc_niid_vidrl$egg_cell, cdc$egg_cell)

setdiff(cdc$virus, cber_cnic_nibsc_niid_vidrl$virus)
setdiff(cber_cnic_nibsc_niid_vidrl$virus, cdc$virus)

cber_cnic_nibsc_niid_vidrl_cdc <- bind_rows(cber_cnic_nibsc_niid_vidrl, cdc)

print_unique(cber_cnic_nibsc_niid_vidrl_cdc)

# SECTION Crick

crick_raw <- readxl::read_excel("data-raw/CRICK-B-vic-HI.xlsx")

crick <- crick_raw %>%
  select(
    virus = `...2`, serum_source = Panel, cohort = Age, egg_cell = `Egg/Cell`,
    serum_id = ID, `Pre-vax` = Before, `Post-vax` = After
  ) %>%
  mutate(testing_lab = "Crick", subtype = "BVic") %>%
  pivot_longer(c(`Pre-vax`, `Post-vax`), names_to = "timepoint", values_to = "titre") %>%
  mutate(
    titre = if_else(titre == 0, 5, titre),
    serum_id = as.character(serum_id),
    # NOTE(sen) Guess
    cohort = recode(cohort, "Adult" = "Adult (18-64 yr)"),
  )

print_unique(crick)

setdiff(crick$serum_source, cber_cnic_nibsc_niid_vidrl_cdc$serum_source)
setdiff(cber_cnic_nibsc_niid_vidrl_cdc$serum_source, crick$serum_source)

setdiff(crick$cohort, cber_cnic_nibsc_niid_vidrl_cdc$cohort)
setdiff(cber_cnic_nibsc_niid_vidrl_cdc$cohort, crick$cohort)

setdiff(crick$subtype, cber_cnic_nibsc_niid_vidrl_cdc$subtype)
setdiff(cber_cnic_nibsc_niid_vidrl_cdc$subtype, crick$subtype)

setdiff(crick$timepoint, cber_cnic_nibsc_niid_vidrl_cdc$timepoint)
setdiff(cber_cnic_nibsc_niid_vidrl_cdc$timepoint, crick$timepoint)

setdiff(crick$egg_cell, cber_cnic_nibsc_niid_vidrl_cdc$egg_cell)
setdiff(cber_cnic_nibsc_niid_vidrl_cdc$egg_cell, crick$egg_cell)

setdiff(crick$virus, cber_cnic_nibsc_niid_vidrl_cdc$virus)
setdiff(cber_cnic_nibsc_niid_vidrl_cdc$virus, crick$virus)

cber_cnic_nibsc_niid_vidrl_cdc_crick <- bind_rows(cber_cnic_nibsc_niid_vidrl_cdc, crick)

print_unique(cber_cnic_nibsc_niid_vidrl_cdc_crick)

#
# SECTION Final processing
#

data_consistent_virus_egg_suffix <- cber_cnic_nibsc_niid_vidrl_cdc_crick %>%
  mutate(virus = if_else(egg_cell == "Egg", paste0(virus, "e"), virus))

data_viruses_clades <- read_csv("data/data-viruses-clades.csv", col_types = cols())

data_with_clades <- data_consistent_virus_egg_suffix %>%
  left_join(data_viruses_clades %>% select(virus, clade), "virus") %>%
  mutate(clade = replace_na(clade, "unassigned"))

unique(data_with_clades$clade)

nextstrain_clade_freqs <- read_csv("data/nextstrain-clade-freqs.csv", col_types = cols())

data_with_clade_freqs <- data_with_clades %>%
  left_join(
    nextstrain_clade_freqs %>%
      filter(year == max(year), freq_norm > 0) %>%
      select(clade, clade_freq = freq_norm), "clade"
  ) %>%
  mutate(clade_freq = replace_na(clade_freq, 0))

unique(data_with_clade_freqs$clade_freq)

write_csv(data_with_clade_freqs, "data/data.csv")

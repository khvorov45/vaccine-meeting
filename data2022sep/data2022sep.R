library(tidyverse)

stats <- read_tsv("data2022sep/2022_SH.stats.txt")
references <- stats %>% 
    select(
        year, hemisphere, flu_set = type, test_type = test, 
        testing_lab, antigen, location, cohort,
        reference
    ) %>% 
    distinct() %>%
    group_by(
        year, hemisphere, flu_set, test_type, 
        testing_lab, antigen, location, cohort
    ) %>%
    filter(row_number() == 1) %>%
    ungroup()

titres <- read_tsv("data2022sep/2022_SH.titers.txt")

titres_with_ref <- left_join(titres, references)

titres_with_ref %>% filter(is.na(reference))
nrow(titres_with_ref) == nrow(titres)

write_csv(titres_with_ref, "titre-visualizer/vis2022sep.csv")

stats_alt <- read_tsv("data2022sep/2022_SH-alt.stats.txt")
references_alt <- stats_alt %>% 
    select(
        year, hemisphere, flu_set = type, test_type = test, 
        testing_lab, antigen, location, cohort,
        reference
    ) %>% 
    distinct() %>%
    group_by(
        year, hemisphere, flu_set, test_type, 
        testing_lab, antigen, location, cohort
    ) %>%
    filter(row_number() == 1) %>%
    ungroup()

titres_alt <- read_tsv("data2022sep/2022_SH-alt.titers.txt")

titres_alt_with_ref <- left_join(titres_alt, references_alt)

titres_alt_with_ref %>% filter(is.na(reference))
nrow(titres_alt_with_ref) == nrow(titres_alt)

write_csv(titres_alt_with_ref, "titre-visualizer/vis2022sep-alt.csv")

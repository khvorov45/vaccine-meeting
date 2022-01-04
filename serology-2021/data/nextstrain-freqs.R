library(tidyverse)

nextstrain_freqs_raw <- read_csv("data-raw/nextstrain-virus-frequencies.csv", col_types = cols())

unique(nextstrain_freqs_raw$year)

nextstrain_freqs <- nextstrain_freqs_raw %>%
  group_by(subtype, clade, year) %>%
  summarise(.groups = "drop", freq_sum = sum(freq)) %>%
  group_by(subtype, year) %>%
  mutate(freq_norm = freq_sum / sum(freq_sum)) %>%
  ungroup() %>%
  mutate(year_chr = as.character(year))

write_csv(nextstrain_freqs, "data/nextstrain-clade-freqs.csv")

library(tidyverse)

data_unsorted <- read_csv("data/data.csv", col_types = cols()) %>%
  mutate(
    timepoint = factor(timepoint, levels = c("Pre-vax", "Post-vax")),
    subtype = factor(subtype, levels = c("H1", "H3", "BVic")),
    cohort = factor(cohort, levels = c(
      "Ped (<3 yr)", "Ped (3-8 yr)", "Ped (9-17 yr)", "Ped (<18 yr)",
      "Adult (18-49 yr)", "Adult (50-64 yr)", "Adult (18-64 yr)",
      "Elderly (>=65 yr)"
    )),
    testing_lab = as.factor(testing_lab),
  )

stopifnot(sum(is.na(data_unsorted$cohort)) == 0)

sorted_viruses <- data_unsorted %>%
  select(virus, subtype) %>%
  distinct() %>%
  mutate(year = str_replace(virus, ".*(\\d{4})e?$", "\\1") %>% as.integer()) %>%
  arrange(subtype, year)

data <- data_unsorted %>%
  mutate(virus = factor(virus, levels = sorted_viruses$virus))

# NOTE(sen) Make sure virus sorting is correct
data %>%
  select(virus, subtype) %>%
  mutate(virus_n = as.integer(virus)) %>%
  distinct() %>%
  arrange(virus) %>%
  print(n = 100)

#
# SECTION Centre variation
#

data %>%
  group_by(testing_lab, serum_source) %>%
  summarise(serum_id = paste(unique(serum_id), collapse = " ")) %>%
  arrange(serum_source)

# NOTE(sen) We can be sure probably that all Australian sera came from
# VIDRL. We have no idea (sometimes) where the US sera came from. Only
# Australian and US sera were tested in multiple centres.

# NOTE(sen) NIID, CNIC and CDC appear to have kept the original VIDRL IDs
sane_centres <- c("VIDRL", "NIID", "CNIC", "CDC")

# NOTE(sen) Darwin wasn't actually tested by CDC
common_antigens <- c("B/Sichuan-Jingyang/12048/2019", "A/Darwin/6/2021")

data_broadest_serum_set <- data %>%
  filter(serum_source == "Australia", testing_lab %in% sane_centres) %>%
  mutate(testing_lab = fct_drop(testing_lab))

data_broadest_serum_set_common <- data_broadest_serum_set %>%
  group_by(serum_id, cohort, serum_source, virus, subtype, timepoint, egg_cell) %>%
  filter(n() == length(sane_centres)) %>%
  filter(virus %in% common_antigens) %>%
  ungroup() %>%
  arrange(serum_id)

data_broadest_serum_set_common_med <- data_broadest_serum_set_common %>%
  group_by(virus, timepoint, testing_lab) %>%
  summarise(.groups = "drop", titre_med = median(titre))

data_broadest_serum_set_common_diffs <- data_broadest_serum_set_common %>%
  group_by(serum_id, timepoint) %>%
  summarise(.groups = "drop", largest_fold_diff = max(titre) / min(titre))

sera_not_within_twofold <- data_broadest_serum_set_common_diffs %>%
  group_by(serum_id, timepoint) %>%
  summarise(.groups = "drop", not_within_twofold = largest_fold_diff > 2) %>%
  group_by(serum_id) %>%
  summarise(not_within_twofold = any(not_within_twofold))

sum(sera_not_within_twofold$not_within_twofold) / nrow(sera_not_within_twofold)
PropCIs::exactci(sum(sera_not_within_twofold$not_within_twofold), nrow(sera_not_within_twofold), 0.95)

jitter_amount <- data_broadest_serum_set_common %>%
  select(serum_id) %>%
  distinct() %>%
  mutate(
    x_jit = rnorm(n(), 0, 0.1),
    y_jit = rnorm(n(), 0, 0.1),
  )

plot_spag <- data_broadest_serum_set_common %>%
  inner_join(jitter_amount, "serum_id") %>%
  inner_join(data_broadest_serum_set_common_diffs, c("serum_id", "timepoint")) %>%
  mutate(
    xpos = as.integer(as.factor(testing_lab)) + x_jit,
    ypos = exp(log(titre) + y_jit),
    col = if_else(largest_fold_diff >= 4, rainbow(n()), "darkgray"),
  ) %>%
  ggplot(aes(xpos, ypos, col = col)) +
  theme_bw() +
  theme(
    legend.position = "none",
    strip.background = element_blank(),
    panel.spacing = unit(0, "null"),
    panel.grid.minor = element_blank(),
  ) +
  facet_grid(timepoint ~ virus) +
  scale_color_identity() +
  scale_y_log10("Titre", breaks = 5 * 2^(0:15)) +
  scale_x_continuous(
    "Testing lab",
    breaks = 1:length(levels(data_broadest_serum_set$testing_lab)),
    labels = levels(data_broadest_serum_set$testing_lab)
  ) +
  geom_line(aes(group = serum_id), alpha = 0.8) +
  geom_point(shape = 18, alpha = 0.8) +
  geom_line(
    aes(as.integer(as.factor(testing_lab)), titre_med),
    data = data_broadest_serum_set_common_med,
    inherit.aes = FALSE, size = 1
  ) +
  geom_point(
    aes(as.integer(as.factor(testing_lab)), titre_med),
    data = data_broadest_serum_set_common_med,
    inherit.aes = FALSE, size = 2
  )

ggsave("data-summary/spag.pdf", plot_spag, width = 12, height = 18, units = "cm")

data_broadest_serum_set_common %>%
  group_by(serum_id, cohort, serum_source, virus, subtype, timepoint, egg_cell) %>%
  summarise(.groups = "drop", largest_fold_diff = max(titre) / min(titre)) %>%
  arrange(desc(largest_fold_diff)) %>%
  print(n = 100)

data_broadest_serum_set_common %>%
  pivot_wider(names_from = "testing_lab", values_from = "titre") %>%
  print(n = 100)

data_broadest_serum_set_ratios <- data_broadest_serum_set_common %>%
  pivot_wider(names_from = "timepoint", values_from = "titre") %>%
  mutate(ratio = `Post-vax` / `Pre-vax`)

jitter_amount_ratios <- data_broadest_serum_set_ratios %>%
  select(serum_id) %>%
  distinct() %>%
  mutate(x_jit = runif(n(), -0.1, 0.1), y_jit = runif(n(), -0.1, 0.1))

data_broadest_serum_set_ratios_diffs <- data_broadest_serum_set_ratios %>%
  group_by(serum_id) %>%
  summarise(largest_fold_diff = max(ratio) / min(ratio)) %>%
  arrange(desc(largest_fold_diff))

plot_spag_ratios <- data_broadest_serum_set_ratios %>%
  inner_join(jitter_amount, "serum_id") %>%
  inner_join(data_broadest_serum_set_ratios_diffs, c("serum_id")) %>%
  mutate(
    xpos = as.integer(as.factor(testing_lab)) + x_jit,
    ypos = exp(log(ratio) + y_jit),
    col = if_else(largest_fold_diff >= 4, rainbow(n()), "darkgray"),
  ) %>%
  ggplot(aes(xpos, ypos, col = col)) +
  theme_bw() +
  theme(
    legend.position = "none",
    strip.background = element_blank(),
    panel.spacing = unit(0, "null"),
    panel.grid.minor = element_blank(),
  ) +
  facet_grid(~virus) +
  scale_color_identity() +
  scale_y_log10("Post/pre ratio", breaks = c(0.125, 0.25, 0.5, 1, 2, 4, 8)) +
  scale_x_continuous("Testing lab", breaks = 1:4, labels = levels(as.factor(data_broadest_serum_set$testing_lab))) +
  geom_line(aes(group = serum_id), alpha = 0.8) +
  geom_point(shape = 18, alpha = 0.8)

ggsave("data-summary/spag-ratios.pdf", plot_spag_ratios, width = 12, height = 12, units = "cm")

#
# SECTION Titres
#

data_viruses_clades <- read_csv("data/data-viruses-clades.csv", col_types = cols()) %>%
  mutate(virus = factor(virus, levels = levels(data$virus)))

# https://www.tga.gov.au/alert/2021-seasonal-influenza-vaccines
vaccine_strains_2021_egg_australia <- c(
  "A/Victoria/2570/2019e",
  "A/Hong Kong/2671/2019e",
  "B/Washington/02/2019e"
)

# https://www.fda.gov/vaccines-blood-biologics/lot-release/influenza-vaccine-2020-2021-season
vaccine_strains_2020_2021_egg_us <- c(
  "A/Guangdong-Maonan/SWL1536/2019e",
  "A/Hong Kong/2671/2019e",
  "B/Washington/02/2019e"
)

stopifnot(sum(!vaccine_strains_2021_egg_australia %in% data$virus) == 0)
stopifnot(sum(!vaccine_strains_2020_2021_egg_us %in% data$virus) == 0)

nextstrain_clade_freqs <- read_csv(
  "data/nextstrain-clade-freqs.csv",
  col_types = cols(year_chr = col_character(), subtype = col_factor(levels(data$subtype)))
)

nextstrain_clade_freqs_plot <- nextstrain_clade_freqs %>%
  filter(freq_sum > 0) %>%
  ggplot(aes(year, freq_norm, fill = clade)) +
  theme_bw() +
  theme(strip.background = element_blank()) +
  facet_wrap(~subtype, ncol = 1, strip.position = "right") +
  scale_x_continuous("Year") +
  scale_y_continuous("Nextstrain global freqs", expand = expansion(c(0, 0.05))) +
  geom_bar(stat = "identity")

ggsave(
  "data-summary/circulating-clades-global-2021.pdf",
  width = 15, height = 10, units = "cm"
)

data_extra <- data %>%
  left_join(data_viruses_clades, "virus") %>%
  left_join(nextstrain_clade_freqs %>% filter(year == max(year)) %>% select(-contains("year"), -freq_sum), c("clade", "subtype")) %>%
  mutate(
    freq_norm = replace_na(freq_norm, 0),
    clade = replace_na(clade, "unassigned") %>% fct_reorder(as.integer(virus)),
    location_cohort = paste(serum_source, cohort) %>%
      fct_reorder(as.integer(cohort) + 100 * as.integer(as.factor(serum_source)))
  )

titre_jitter <- data_extra %>%
  select(serum_id) %>%
  distinct() %>%
  mutate(titre_jitter = runif(n(), -0.1, 0.1))

summarise_logmean <- function(vec) {
  vec <- na.omit(vec)
  log_vec <- log(vec)
  mean_log_vec <- mean(log_vec)
  sd_log_vec <- sd(log_vec)
  se_mean_log_vec <- sd_log_vec / sqrt(length(vec))
  mean_log_vec_low <- mean_log_vec - 1.96 * se_mean_log_vec
  mean_log_vec_high <- mean_log_vec + 1.96 * se_mean_log_vec
  tibble(mean = exp(mean_log_vec), low = exp(mean_log_vec_low), high = exp(mean_log_vec_high))
}

data_gmts <- data_extra %>%
  group_by(serum_source, cohort, testing_lab, subtype, timepoint, virus, clade, location_cohort) %>%
  summarise(.groups = "drop", summarise_logmean(titre))

plotlist_titres <- data_extra %>%
  group_split(location_cohort, subtype) %>%
  map(function(data_subset) {
    data_us_subset_plot_group_virus_n_offsets <- data_subset %>%
      group_by(testing_lab) %>%
      summarise(.groups = "drop", virus_count = length(unique(virus))) %>%
      arrange(testing_lab) %>%
      mutate(virus_n_offset = cumsum(lag(virus_count, default = 0)))

    data_subset_plot_x_axis <- data_subset %>%
      group_split(testing_lab) %>%
      map_dfr(~ mutate(.x,
        virus = fct_drop(virus),
        virus_n = as.integer(virus),
      )) %>%
      select(testing_lab, virus, virus_n) %>%
      distinct() %>%
      inner_join(data_us_subset_plot_group_virus_n_offsets, "testing_lab") %>%
      mutate(virus_n = virus_n + virus_n_offset)

    data_us_subset_plot_lab_markers <- data_subset_plot_x_axis %>%
      group_by(testing_lab) %>%
      summarise(start = min(virus_n), end = max(virus_n)) %>%
      mutate(center = (start + end) / 2)

    data_us_subset_for_plot <- data_subset %>%
      inner_join(titre_jitter, "serum_id") %>%
      inner_join(data_subset_plot_x_axis, c("testing_lab", "virus")) %>%
      mutate(
        point_type = case_when(
          virus %in% vaccine_strains_2020_2021_egg_us & timepoint == "Pre-vax" ~ "Pre-vax (vaccine)",
          virus %in% vaccine_strains_2020_2021_egg_us & timepoint == "Post-vax" ~ "Post-vax (vaccine)",
          timepoint == "Pre-vax" ~ "Pre-vax",
          timepoint == "Post-vax" ~ "Post-vax",
          TRUE ~ "black"
        ) %>%
          factor(c("Pre-vax", "Post-vax", "Pre-vax (vaccine)", "Post-vax (vaccine)")),
        xpos = virus_n + if_else(timepoint == "Post-vax", 1L, -1L) * 0.20,
        xpos_clade = virus_n,
        ypos = exp(log(titre) + titre_jitter),
      )

    data_us_subset_plot_sample_counts <- data_us_subset_for_plot %>%
      count(testing_lab, virus_n, timepoint, point_type, xpos)

    data_subset_gmts <- data_gmts %>%
      filter(
        location_cohort == unique(data_subset$location_cohort),
        subtype == unique(data_subset$subtype)
      ) %>%
      inner_join(data_subset_plot_x_axis, c("testing_lab", "virus")) %>%
      mutate(
        xpos_gmt = virus_n + if_else(timepoint == "Post-vax", 1L, -3L) * 0.1,
        point_type = case_when(
          virus %in% vaccine_strains_2020_2021_egg_us & timepoint == "Pre-vax" ~ "Pre-vax (vaccine)",
          virus %in% vaccine_strains_2020_2021_egg_us & timepoint == "Post-vax" ~ "Post-vax (vaccine)",
          timepoint == "Pre-vax" ~ "Pre-vax",
          timepoint == "Post-vax" ~ "Post-vax",
          TRUE ~ "black"
        ) %>%
          factor(c("Pre-vax", "Post-vax", "Pre-vax (vaccine)", "Post-vax (vaccine)")),
      )

    plot_us_subset_titre <- data_us_subset_for_plot %>%
      ggplot(aes(xpos, ypos, col = point_type)) +
      theme_bw() +
      theme(
        strip.background = element_blank(),
        panel.spacing = unit(0, "null"),
        axis.text.x = element_text(angle = 45, hjust = 1),
        plot.margin = margin(5, 5, 5, 25),
        panel.grid.minor = element_blank(),
        legend.position = "bottom",
        legend.box.spacing = unit(0, "null"),
      ) +
      facet_grid(location_cohort ~ subtype) +
      scale_y_log10(
        "Titre",
        breaks = 5 * 2^(0:15), expand = expansion(add = c(0.5, 0.02))
      ) +
      scale_x_continuous(
        "Virus",
        breaks = data_subset_plot_x_axis$virus_n,
        labels = data_subset_plot_x_axis$virus,
        expand = expansion(0.02),
      ) +
      scale_color_manual(
        "Timepoint",
        values = c("#308A36", "#7FA438", "#8E3164", "#B0403D"),
      ) +
      guides(colour = guide_legend(override.aes = list(alpha = 1, size = 3, shape = 18, geom = "point"))) +

      # NOTE(sen) Lab marker
      geom_segment(
        aes(x = start, xend = end, y = 2, yend = 2),
        data = data_us_subset_plot_lab_markers,
        inherit.aes = FALSE,
        col = "gray20"
      ) +
      geom_text(
        aes(x = center, y = 2, label = testing_lab),
        data = data_us_subset_plot_lab_markers,
        inherit.aes = FALSE, vjust = -0.25,
      ) +

      # NOTE(sen) Threshold marker
      geom_hline(yintercept = 40, alpha = 0.4, lty = "11") +

      # NOTE(sen) Points, lines and boxplots
      geom_line(
        aes(group = paste0(serum_id, virus_n, testing_lab, subtype, cohort)),
        alpha = 0.1,
        show.legend = FALSE,
      ) +
      geom_point(shape = 18, alpha = 0.5) +
      geom_boxplot(
        aes(y = titre, group = paste0(virus_n, timepoint)),
        outlier.alpha = 0, fill = NA,
        show.legend = FALSE,
      ) +

      # NOTE(sen) Sample counts
      geom_text(
        aes(y = 5120, label = n),
        data = data_us_subset_plot_sample_counts,
        size = 2, vjust = 1, angle = 45, hjust = 1
      ) +

      # NOTE(sen) Clade labels
      geom_text(
        aes(xpos_clade, y = 2, label = clade),
        size = 2, angle = 45, hjust = 1, vjust = 1,
        data = . %>%
          select(xpos_clade, clade, point_type, subtype, cohort, freq_norm, testing_lab) %>%
          distinct(),
        show.legend = FALSE,
      ) +
      geom_text(
        aes(xpos_clade, y = 2, label = paste0(round(100 * freq_norm), "%")),
        size = 2, angle = 45, hjust = 1, vjust = 2.5,
        data = . %>%
          select(xpos_clade, clade, point_type, subtype, freq_norm, cohort, testing_lab) %>%
          distinct(),
        show.legend = FALSE,
      ) +

      # NOTE(sen) GMTs
      geom_pointrange(
        aes(xpos_gmt, mean, ymin = low, ymax = high),
        data = data_subset_gmts, shape = 4, show.legend = FALSE
      )

    attr(plot_us_subset_titre, "virus_count") <- length(unique(data_us_subset_for_plot$virus_n))

    plot_us_subset_titre
  })

plotlist_us_x_axis_lengths <- map_dbl(plotlist_titres, ~ attr(.x, "virus_count"))

plot_titres <- ggpubr::ggarrange(
  plotlist = plotlist_titres,
  nrow = 1,
  widths = plotlist_us_x_axis_lengths * 1.2 + 5,
  common.legend = TRUE,
  align = "h"
)

ggsave(
  "data-summary/titres.pdf", plot_titres,
  width = 13 * length(plotlist_titres), height = 13, units = "cm", limitsize = FALSE,
)

#
# SECTION Clade averages
#

vaccine_clades_2020_2021_egg_northern <- data_extra %>%
  filter(virus %in% vaccine_strains_2020_2021_egg_us) %>%
  pull(clade) %>%
  unique()

data_clade_avg <- data_extra %>%
  group_by(serum_id, serum_source, cohort, testing_lab, subtype, timepoint, clade, freq_norm, location_cohort) %>%
  filter(n() == 1 | egg_cell == "Cell") %>%
  summarise(.groups = "drop", titre_clade_avg = exp(mean(log(titre))))

data_clade_gmts <- data_clade_avg %>%
  group_by(serum_source, cohort, testing_lab, subtype, timepoint, clade, location_cohort) %>%
  summarise(.groups = "drop", summarise_logmean(titre_clade_avg))

plotlist_titres_clade_avg <- data_clade_avg %>%
  group_split(location_cohort, subtype) %>%
  map(function(data_subset) {
    data_subset_plot_group_clade_n_offsets <- data_subset %>%
      group_by(testing_lab) %>%
      summarise(.groups = "drop", clade_count = length(unique(clade))) %>%
      arrange(testing_lab) %>%
      mutate(clade_n_offset = cumsum(lag(clade_count, default = 0)))

    data_subset_plot_x_axis <- data_subset %>%
      group_split(testing_lab) %>%
      map_dfr(~ mutate(.x,
        clade = fct_drop(clade),
        clade_n = as.integer(clade),
      )) %>%
      select(testing_lab, clade, clade_n, freq_norm) %>%
      distinct() %>%
      inner_join(data_subset_plot_group_clade_n_offsets, "testing_lab") %>%
      mutate(clade_n = clade_n + clade_n_offset)

    data_subset_plot_lab_markers <- data_subset_plot_x_axis %>%
      group_by(testing_lab) %>%
      summarise(start = min(clade_n), end = max(clade_n)) %>%
      mutate(center = (start + end) / 2)

    data_subset_for_plot <- data_subset %>%
      inner_join(titre_jitter, "serum_id") %>%
      inner_join(data_subset_plot_x_axis, c("testing_lab", "clade")) %>%
      mutate(
        point_type = case_when(
          clade %in% vaccine_clades_2020_2021_egg_northern & timepoint == "Pre-vax" ~ "Pre-vax (vaccine)",
          clade %in% vaccine_clades_2020_2021_egg_northern & timepoint == "Post-vax" ~ "Post-vax (vaccine)",
          timepoint == "Pre-vax" ~ "Pre-vax",
          timepoint == "Post-vax" ~ "Post-vax",
          TRUE ~ "black"
        ) %>%
          factor(c("Pre-vax", "Post-vax", "Pre-vax (vaccine)", "Post-vax (vaccine)")),
        xpos = clade_n + if_else(timepoint == "Post-vax", 1L, -1L) * 0.20,
        xpos_clade = clade_n,
        ypos = exp(log(titre_clade_avg) + titre_jitter),
      )

    data_us_subset_plot_sample_counts <- data_subset_for_plot %>%
      count(testing_lab, clade_n, timepoint, point_type, xpos)

    data_subset_circulation_gmts <- data_clade_gmts %>%
      filter(
        location_cohort == unique(data_subset$location_cohort),
        subtype == unique(data_subset$subtype)
      ) %>%
      inner_join(data_subset_plot_x_axis, c("testing_lab", "clade")) %>%
      mutate(
        xpos_gmt = clade_n + if_else(timepoint == "Post-vax", 1L, -3L) * 0.1,
        point_type = case_when(
          clade %in% vaccine_clades_2020_2021_egg_northern & timepoint == "Pre-vax" ~ "Pre-vax (vaccine)",
          clade %in% vaccine_clades_2020_2021_egg_northern & timepoint == "Post-vax" ~ "Post-vax (vaccine)",
          timepoint == "Pre-vax" ~ "Pre-vax",
          timepoint == "Post-vax" ~ "Post-vax",
          TRUE ~ "black"
        ) %>%
          factor(c("Pre-vax", "Post-vax", "Pre-vax (vaccine)", "Post-vax (vaccine)")),
      )

    plot_subset_titre <- data_subset_for_plot %>%
      ggplot(aes(xpos, ypos, col = point_type)) +
      theme_bw() +
      theme(
        strip.background = element_blank(),
        panel.spacing = unit(0, "null"),
        axis.text.x = element_text(angle = 45, hjust = 1),
        plot.margin = margin(5, 5, 5, 25),
        panel.grid.minor = element_blank(),
        legend.position = "bottom",
        legend.box.spacing = unit(0, "null"),
      ) +
      facet_grid(location_cohort ~ subtype) +
      scale_y_log10(
        "Titre",
        breaks = 5 * 2^(0:15), expand = expansion(add = c(0.5, 0.02))
      ) +
      scale_x_continuous(
        "Virus",
        breaks = data_subset_plot_x_axis$clade_n,
        labels = paste0(data_subset_plot_x_axis$clade, " (", round(100 * data_subset_plot_x_axis$freq_norm), "%)"),
        expand = expansion(0.02),
      ) +
      scale_color_manual(
        "Timepoint",
        values = c("#308A36", "#7FA438", "#8E3164", "#B0403D"),
      ) +
      guides(colour = guide_legend(override.aes = list(alpha = 1, size = 3, shape = 18, geom = "point"))) +

      # NOTE(sen) Lab marker
      geom_segment(
        aes(x = start, xend = end, y = 2, yend = 2),
        data = data_subset_plot_lab_markers,
        inherit.aes = FALSE,
        col = "gray20"
      ) +
      geom_text(
        aes(x = center, y = 2, label = testing_lab),
        data = data_subset_plot_lab_markers,
        inherit.aes = FALSE, vjust = -0.25,
      ) +

      # NOTE(sen) Threshold marker
      geom_hline(yintercept = 40, alpha = 0.4, lty = "11") +

      # NOTE(sen) Points, lines and boxplots
      geom_line(
        aes(group = paste0(serum_id, clade_n, testing_lab, subtype, cohort)),
        alpha = 0.1,
        show.legend = FALSE,
      ) +
      geom_point(shape = 18, alpha = 0.5) +
      geom_boxplot(
        aes(y = titre_clade_avg, group = paste0(clade_n, timepoint)),
        outlier.alpha = 0, fill = NA,
        show.legend = FALSE,
      ) +

      # NOTE(sen) Sample counts
      geom_text(
        aes(y = 5120, label = n),
        data = data_us_subset_plot_sample_counts,
        size = 2, vjust = 1, angle = 45, hjust = 1
      ) +

      # NOTE(sen) GMTs
      geom_pointrange(
        aes(xpos_gmt, mean, ymin = low, ymax = high),
        data = data_subset_circulation_gmts
      )

    attr(plot_subset_titre, "clade_count") <- length(unique(data_subset_for_plot$clade_n))

    plot_subset_titre
  })

plotlist_titres_clade_avg_x_axis_lengths <- map_dbl(plotlist_titres_clade_avg, ~ attr(.x, "clade_count"))

plot_titres_clade_avg <- ggpubr::ggarrange(
  plotlist = plotlist_titres_clade_avg,
  nrow = 1,
  widths = plotlist_titres_clade_avg_x_axis_lengths * 1.2 + 5,
  common.legend = TRUE,
  align = "h"
)

ggsave(
  "data-summary/titres-clade-avg.pdf", plot_titres_clade_avg,
  width = 13 * length(plotlist_titres_clade_avg), height = 13, units = "cm", limitsize = FALSE,
)

#
# SECTION Circulation averages
#

data_circulation_avg <- data_clade_avg %>%
  group_by(serum_id, serum_source, cohort, testing_lab, subtype, timepoint, location_cohort) %>%
  filter(sum(freq_norm) > 0) %>%
  summarise(
    .groups = "drop",
    titre_circulating = exp(sum(log(titre_clade_avg) * freq_norm) / sum(freq_norm))
  )

data_circulation_gmts <- data_circulation_avg %>%
  group_by(serum_source, cohort, testing_lab, subtype, timepoint, location_cohort) %>%
  summarise(.groups = "drop", summarise_logmean(titre_circulating))

plotlist_titres_circulation_avg <- data_circulation_avg %>%
  group_split(location_cohort, subtype) %>%
  map(function(data_subset) {
    data_subset_plot_x_axis <- data_subset %>%
      group_split(subtype, location_cohort) %>%
      map_dfr(~ mutate(.x,
        testing_lab = fct_drop(testing_lab),
        testing_lab_n = as.integer(testing_lab),
      )) %>%
      select(testing_lab, testing_lab_n) %>%
      distinct()

    data_subset_circulation_gmts <- data_circulation_gmts %>%
      filter(
        location_cohort == unique(data_subset$location_cohort),
        subtype == unique(data_subset$subtype)
      ) %>%
      inner_join(data_subset_plot_x_axis, "testing_lab") %>%
      mutate(
        xpos_gmt = testing_lab_n + if_else(timepoint == "Post-vax", 1L, -3L) * 0.1,
      )

    data_subset_for_plot <- data_subset %>%
      inner_join(titre_jitter, "serum_id") %>%
      inner_join(data_subset_plot_x_axis, c("testing_lab")) %>%
      mutate(
        xpos = testing_lab_n + if_else(timepoint == "Post-vax", 1L, -1L) * 0.20,
        ypos = exp(log(titre_circulating) + titre_jitter),
      )

    data_subset_plot_sample_counts <- data_subset_for_plot %>%
      count(testing_lab, testing_lab_n, timepoint, xpos)

    plot_subset_titre <- data_subset_for_plot %>%
      ggplot(aes(xpos, ypos, col = timepoint)) +
      theme_bw() +
      theme(
        strip.background = element_blank(),
        panel.spacing = unit(0, "null"),
        # axis.text.x = element_text(angle = 45, hjust = 1),
        plot.margin = margin(5, 5, 5, 25),
        panel.grid.minor = element_blank(),
        legend.position = "bottom",
        legend.box.spacing = unit(0, "null"),
      ) +
      facet_grid(location_cohort ~ subtype) +
      scale_y_log10(
        "Titre",
        breaks = 5 * 2^(0:15), expand = expansion(add = c(0.5, 0.02))
      ) +
      scale_x_continuous(
        "Testing lab",
        breaks = data_subset_plot_x_axis$testing_lab_n,
        labels = data_subset_plot_x_axis$testing_lab,
        expand = expansion(0.02),
      ) +
      scale_color_manual(
        "Timepoint",
        values = c("#308A36", "#7FA438", "#8E3164", "#B0403D"),
        drop = FALSE
      ) +
      guides(colour = guide_legend(override.aes = list(alpha = 1, size = 1, shape = 18, geom = "point"))) +

      # NOTE(sen) Threshold marker
      geom_hline(yintercept = 40, alpha = 0.4, lty = "11") +

      # NOTE(sen) Points, lines and boxplots
      geom_line(
        aes(group = paste0(serum_id, testing_lab_n, testing_lab, subtype, cohort)),
        alpha = 0.1,
        show.legend = FALSE,
      ) +
      geom_point(shape = 18, alpha = 0.5) +
      geom_boxplot(
        aes(y = titre_circulating, group = paste0(testing_lab_n, timepoint)),
        outlier.alpha = 0, fill = NA,
        show.legend = FALSE,
      ) +

      # NOTE(sen) Sample counts
      geom_text(
        aes(y = 5120, label = n),
        data = data_subset_plot_sample_counts,
        size = 2, vjust = 1, angle = 45, hjust = 1
      ) +

      # NOTE(sen) GMTs
      geom_pointrange(
        aes(xpos_gmt, mean, ymin = low, ymax = high),
        data = data_subset_circulation_gmts
      )

    attr(plot_subset_titre, "testing_lab_count") <- length(unique(data_subset_for_plot$testing_lab))

    plot_subset_titre
  })

plotlist_titres_circulation_x_axis_lengths <- map_dbl(plotlist_titres_circulation_avg, ~ attr(.x, "testing_lab_count"))

plot_titres_circulation <- ggpubr::ggarrange(
  plotlist = plotlist_titres_circulation_avg,
  nrow = 1,
  widths = if_else(plotlist_titres_circulation_x_axis_lengths != 1, plotlist_titres_circulation_x_axis_lengths, 1.5),
  common.legend = TRUE,
  align = "h"
)

ggsave(
  "data-summary/titres-circulation-avg.pdf", plot_titres_circulation,
  width = 7 * length(plotlist_titres_circulation_avg), height = 13, units = "cm", limitsize = FALSE,
)

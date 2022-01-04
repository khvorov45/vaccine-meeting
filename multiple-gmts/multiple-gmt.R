# A way to represent multiple gmts

library(tidyverse)

# Functions ===================================================================

censor_titres <- function(titres) {
  cuts <- cut(titres, c(-Inf, 5 * 2^(1:10), Inf)) %>% as.integer()
  5 * 2^(cuts - 1)
}

correct_for_baseline <- function(postvax, prevax) {
  logpost <- log(postvax)
  logpre <- log(prevax)
  fit <- lm(logpost ~ logpre)
  b1 <- fit$coef[["logpre"]]
  exp(logpost - b1 * (logpre - log(10)))
}

calc_gmt <- function(titres) {
  logtitres <- log(titres)
  se <- sd(logtitres) / sqrt(length(titres))
  tibble(
    point = mean(logtitres),
    low = qnorm(0.025, point, se),
    high = qnorm(0.975, point, se)
  ) %>%
    mutate_all(exp)
}

remap_range <- function(x, min, max) {
  (x - min(x)) * (max - min) / max(x) + min
}

format_percent <- function(x) {
  paste0(signif(x, 2) * 100, "%")
}

# Script ======================================================================

# Simulate some data

# Virus names and expected increases
viruses <- tibble(
  expected_proportion = c(1, 5, 1, 15) %>% `/`(., sum(.)),
  pair = c("reference", "same", "better", "worse") %>% factor(., levels = .),
  expected_logincrease = log(c(3, 3, 4, 2)),
) %>%
  group_by(pair, expected_proportion, expected_logincrease) %>%
  summarise(
    tibble(
      virus = paste(pair, c("cell", "egg"), sep = "_") %>%
        factor(., levels = .),
      expected_logincrease = c(
        expected_logincrease, expected_logincrease + log(1.5)
      ),
      egg = c(FALSE, TRUE)
    ),
    .groups = "drop"
  )

titres_ind <- tibble(id = 1:100) %>% # Individuals
  # Add viruses (long format)
  group_by(id) %>%
  summarise(viruses, .groups = "drop") %>%
  mutate(
    logprevax_uncens = rnorm(n(), 2, 1),
    logpostvax_uncens = rnorm(
      n(), logprevax_uncens + expected_logincrease, 0.1
    ),
    prevax = exp(logprevax_uncens) %>% censor_titres(),
    postvax = exp(logpostvax_uncens) %>% censor_titres(),
    postvax_corrected = correct_for_baseline(postvax, prevax),
  )

titre_averages <- titres_ind %>%
  group_by(id, egg) %>%
  summarise(
    postvax_corrected = exp(
      sum(log(postvax_corrected) * expected_proportion) /
        sum(expected_proportion)
    ),
    expected_proportion = 1,
    pair = "average",
    .groups = "drop"
  ) %>%
  mutate(virus = if_else(egg, "average_egg", "average_cell") %>% factor())

# Combine the titres
titres <- titres_ind %>%
  select(id, virus, postvax_corrected, expected_proportion, egg, pair) %>%
  bind_rows(titre_averages)

gmts <- titres %>%
  group_by(virus, pair, egg) %>%
  summarise(
    n = n(),
    calc_gmt(postvax_corrected),
    .groups = "drop"
  )

pl <- titres %>%
  ggplot(aes(virus, postvax_corrected)) +
  theme_bw() +
  theme(
    panel.grid.minor = element_blank(),
    legend.position = "bottom",
    legend.box.spacing = unit(0, "null")
  ) +
  scale_y_log10("Corrected post-vax titre", breaks = 5 * 2^(0:10)) +
  scale_x_discrete(
    "Virus",
    breaks = levels(titres$virus),
    labels = as_labeller(c(
      "reference_cell" = "Reference cell",
      "reference_egg" = "Reference egg",
      "same_cell" = "I cell",
      "same_egg" = "I egg",
      "better_cell" = "II cell",
      "better_egg" = "II egg",
      "worse_cell" = "III cell",
      "worse_egg" = "III egg",
      "average_cell" = "Average cell",
      "average_egg" = "Average egg"
    ))
  ) +
  scale_fill_brewer(
    "Reference GMT",
    type = "qual",
    labels = as_labeller(c("reference_cell" = "Cell", "reference_egg" = "Egg"))
  ) +
  coord_cartesian(ylim = c(5, NA)) +
  # Reference GMT bands
  geom_rect(
    aes(ymin = low, ymax = high, fill = virus),
    filter(gmts, str_detect(virus, "ref")),
    xmin = 0, xmax = length(levels(titres$virus)) + 1,
    inherit.aes = FALSE,
    alpha = 0.7
  ) +
  geom_jitter(
    shape = 16, alpha = 0.4, color = "gray60", width = 0.1, height = 0.02
  ) +
  geom_boxplot(
    aes(virus, group = virus),
    fill = NA, col = "darkblue", outlier.alpha = 0
  ) +
  # Virus GMT's
  geom_pointrange(
    aes(virus, point, ymin = low, ymax = high),
    gmts,
    shape = 18,
    col = "darkred"
  ) +
  # Expected proportions
  geom_segment(
    aes(x = start, xend = end, y = 4.5, yend = 4.5),
    viruses %>%
      mutate(virus_n = as.integer(virus)) %>%
      group_by(pair) %>%
      summarise(start = min(virus_n), end = max(virus_n), .groups = "drop"),
    inherit.aes = FALSE
  ) +
  geom_text(
    aes(label_coord, 5, label = format_percent(expected_proportion)),
    viruses %>% group_by(pair) %>% mutate(label_coord = mean(as.integer(virus)))
  ) +
  geom_text(
    aes(virus, max(titres$postvax_corrected) + 15, label = n),
    gmts,
  ) +
  labs(
    caption = paste(
      "Titres were corrected for baseline of 10",
      "Points are individial (corrected) jittered titre observations",
      "Ribbons are 95% GMT CIs for the reference viruses",
      "Diamonds are GMTs and associated lines are their 95% CIs",
      "Boxplots are for (corrected) titres",
      "Numbers at the bottom are the expected proportions",
      "Numbers at the top are the sample size",
      "Average is weighted by the expected proportions",
      sep = "\n"
    )
  )

# Warnings are from boxplot - always produces them with weights for some reason
ggsave(
  "multiple-virus-gmt.pdf", pl,
  width = 25, height = 15, units = "cm"
)
